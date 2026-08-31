"use server";

// ABM del catálogo de ítems (recetas reutilizables entre obras) y el
// cálculo de su APU. A diferencia del historial de precios, acá los
// componentes de la receta sí se editan y se borran de verdad: es una
// receta, no un ledger (CLAUDE.md 4.1: receta y precio están separados).

import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/client";
import {
  componenteApu,
  conceptoCargaSocial,
  insumo,
  itemCatalogo,
  parametrosEmpresa,
  precioInsumo,
  rubro,
} from "@/lib/db/schema";
import { calcularCostoApu, type ComponenteApuInput } from "@/lib/calculo/apu";
import { calcularFactorCargasSociales } from "@/lib/calculo/cargas-sociales";
import { calcularCoeficienteResumen } from "@/lib/calculo/coeficiente-resumen";
import { hoyISO } from "@/lib/formato";

const RUTA = "/catalogo";

const esquemaItemCatalogo = z.object({
  codigo: z.string().trim().min(1, "Falta el código"),
  rubroId: z.number().int().positive("Elegí un rubro"),
  descripcion: z.string().trim().min(1, "Falta la descripción"),
  unidad: z.enum(["m2", "m3", "ml", "u", "gl", "kg"]),
});

export async function listarItemsCatalogo() {
  const filas = await db
    .select({
      id: itemCatalogo.id,
      codigo: itemCatalogo.codigo,
      descripcion: itemCatalogo.descripcion,
      unidad: itemCatalogo.unidad,
      origen: itemCatalogo.origen,
      activo: itemCatalogo.activo,
      rubroId: itemCatalogo.rubroId,
      rubroNombre: rubro.nombre,
    })
    .from(itemCatalogo)
    .innerJoin(rubro, eq(itemCatalogo.rubroId, rubro.id))
    .orderBy(rubro.orden, itemCatalogo.descripcion);

  return filas;
}

export async function obtenerItemCatalogo(id: number) {
  const [item] = await db.select().from(itemCatalogo).where(eq(itemCatalogo.id, id));
  if (!item) return null;

  const componentes = await db
    .select({
      id: componenteApu.id,
      insumoId: componenteApu.insumoId,
      tipo: componenteApu.tipo,
      cantidadUnitaria: componenteApu.cantidadUnitaria,
      desperdicioPct: componenteApu.desperdicioPct,
      rendimientoHoras: componenteApu.rendimientoHoras,
      observacion: componenteApu.observacion,
      insumoCodigo: insumo.codigo,
      insumoDescripcion: insumo.descripcion,
      insumoUnidad: insumo.unidad,
    })
    .from(componenteApu)
    .innerJoin(insumo, eq(componenteApu.insumoId, insumo.id))
    .where(eq(componenteApu.itemCatalogoId, id));

  return { item, componentes };
}

export async function crearItemCatalogo(datosCrudos: unknown) {
  const datos = esquemaItemCatalogo.parse(datosCrudos);

  const [nuevo] = await db
    .insert(itemCatalogo)
    .values({ ...datos, origen: "usuario", creadoEn: hoyISO() })
    .returning();

  revalidatePath(RUTA);
  return nuevo;
}

export async function editarItemCatalogo(id: number, datosCrudos: unknown) {
  const datos = esquemaItemCatalogo.parse(datosCrudos);
  await db.update(itemCatalogo).set(datos).where(eq(itemCatalogo.id, id));
  revalidatePath(RUTA);
}

export async function cambiarActivoItemCatalogo(id: number, activo: boolean) {
  await db.update(itemCatalogo).set({ activo }).where(eq(itemCatalogo.id, id));
  revalidatePath(RUTA);
}

const esquemaComponenteMaterial = z.object({
  tipo: z.literal("material"),
  insumoId: z.number().int().positive(),
  cantidadUnitaria: z.number().positive("La cantidad tiene que ser mayor a cero"),
  desperdicioPct: z.number().min(0, "El desperdicio no puede ser negativo"),
  observacion: z.string().trim().optional(),
});

const esquemaComponenteConRendimiento = z.object({
  tipo: z.enum(["mano_obra", "equipo"]),
  insumoId: z.number().int().positive(),
  rendimientoHoras: z.number().positive("El rendimiento tiene que ser mayor a cero"),
  observacion: z.string().trim().optional(),
});

const esquemaComponente = z.discriminatedUnion("tipo", [
  esquemaComponenteMaterial,
  esquemaComponenteConRendimiento,
]);

function normalizarComponente(datos: z.infer<typeof esquemaComponente>) {
  if (datos.tipo === "material") {
    return {
      tipo: datos.tipo,
      insumoId: datos.insumoId,
      cantidadUnitaria: datos.cantidadUnitaria,
      desperdicioPct: datos.desperdicioPct,
      rendimientoHoras: null,
      observacion: datos.observacion ?? null,
    };
  }

  return {
    tipo: datos.tipo,
    insumoId: datos.insumoId,
    cantidadUnitaria: null,
    desperdicioPct: null,
    rendimientoHoras: datos.rendimientoHoras,
    observacion: datos.observacion ?? null,
  };
}

export async function agregarComponente(itemCatalogoId: number, datosCrudos: unknown) {
  const datos = esquemaComponente.parse(datosCrudos);

  const [nuevo] = await db
    .insert(componenteApu)
    .values({ itemCatalogoId, ...normalizarComponente(datos) })
    .returning();

  revalidatePath(RUTA);
  return nuevo;
}

export async function editarComponente(id: number, datosCrudos: unknown) {
  const datos = esquemaComponente.parse(datosCrudos);
  await db.update(componenteApu).set(normalizarComponente(datos)).where(eq(componenteApu.id, id));
  revalidatePath(RUTA);
}

export async function eliminarComponente(id: number) {
  await db.delete(componenteApu).where(eq(componenteApu.id, id));
  revalidatePath(RUTA);
}

export async function calcularApuDeItem(itemCatalogoId: number, fecha: string) {
  const componentesDb = await db
    .select()
    .from(componenteApu)
    .where(eq(componenteApu.itemCatalogoId, itemCatalogoId));

  const insumoIds = [...new Set(componentesDb.map((c) => c.insumoId))];

  const [insumosDb, preciosDb, conceptosDb, parametrosDb] = await Promise.all([
    insumoIds.length > 0
      ? db.select().from(insumo).where(inArray(insumo.id, insumoIds))
      : Promise.resolve([]),
    insumoIds.length > 0
      ? db
          .select()
          .from(precioInsumo)
          .where(inArray(precioInsumo.insumoId, insumoIds))
          .orderBy(precioInsumo.id)
      : Promise.resolve([]),
    db
      .select()
      .from(conceptoCargaSocial)
      .where(eq(conceptoCargaSocial.activo, true))
      .orderBy(conceptoCargaSocial.orden),
    db.select().from(parametrosEmpresa).limit(1),
  ]);

  const [parametrosEmpresaFila] = parametrosDb;

  const historialPorInsumo = new Map<number, { fechaVigencia: string; precio: number }[]>();
  for (const precio of preciosDb) {
    const lista = historialPorInsumo.get(precio.insumoId) ?? [];
    lista.push({ fechaVigencia: precio.fechaVigencia, precio: precio.precio });
    historialPorInsumo.set(precio.insumoId, lista);
  }

  const cargasSociales = calcularFactorCargasSociales(
    conceptosDb.map((c) => ({
      nombre: c.nombre,
      alicuotaPct: c.alicuotaPct,
      baseAplicacion: c.baseAplicacion,
      orden: c.orden,
    }))
  );

  const componentesInput: ComponenteApuInput[] = componentesDb.map((c) => ({
    id: c.id,
    insumoId: c.insumoId,
    tipo: c.tipo,
    cantidadUnitaria: c.cantidadUnitaria,
    desperdicioPct: c.desperdicioPct,
    rendimientoHoras: c.rendimientoHoras,
  }));

  const apu = calcularCostoApu(componentesInput, historialPorInsumo, fecha, cargasSociales.factor);

  const insumosPorId = new Map(insumosDb.map((i) => [i.id, i]));
  const lineasConInsumo = apu.lineas.map((linea) => ({
    ...linea,
    insumo: insumosPorId.get(linea.insumoId) ?? null,
  }));

  if (!parametrosEmpresaFila) {
    return {
      apu: { ...apu, lineas: lineasConInsumo },
      cargasSociales,
      coeficiente: null,
      errorParametros: "Todavía no cargaste los parámetros de empresa (pestaña Bases maestras).",
    };
  }

  const coeficiente = calcularCoeficienteResumen(apu.costoDirecto, parametrosEmpresaFila);

  return {
    apu: { ...apu, lineas: lineasConInsumo },
    cargasSociales,
    coeficiente,
    errorParametros: null,
  };
}
