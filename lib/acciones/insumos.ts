"use server";

// Acciones de servidor para el ABM de insumos (materiales, mano de obra,
// equipos) y su historial de precios. Reglas que se respetan acá:
// - Actualizar un precio SIEMPRE inserta una fila nueva (CLAUDE.md 4.2).
// - Borrado lógico: nunca se hace DELETE, se marca activo=false (CLAUDE.md 4.5).

import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/client";
import { insumo, precioInsumo } from "@/lib/db/schema";
import { obtenerPrecioVigente } from "@/lib/calculo/precios";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

const RUTA = "/bases-maestras";

const esquemaInsumo = z.object({
  codigo: z.string().trim().min(1, "Falta el código"),
  descripcion: z.string().trim().min(1, "Falta la descripción"),
  unidad: z.string().trim().min(1, "Falta la unidad"),
  tipo: z.enum(["material", "mano_obra", "equipo"]),
});

const esquemaPrecioInicial = z.object({
  precio: z.number().positive("El precio tiene que ser mayor a cero"),
  fechaVigencia: z.string().min(1, "Falta la fecha de vigencia"),
  fuente: z.string().trim().optional(),
});

export async function listarInsumos() {
  const [insumos, precios] = await Promise.all([
    db.select().from(insumo).orderBy(insumo.tipo, insumo.descripcion),
    db.select().from(precioInsumo).orderBy(precioInsumo.id),
  ]);

  const hoy = hoyISO();

  return insumos.map((fila) => {
    const historial = precios
      .filter((p) => p.insumoId === fila.id)
      .map((p) => ({ fechaVigencia: p.fechaVigencia, precio: p.precio }));
    const vigente = obtenerPrecioVigente(historial, hoy);

    return {
      ...fila,
      precioVigente: vigente?.precio ?? null,
      cantidadPreciosCargados: historial.length,
    };
  });
}

export async function crearInsumo(datosCrudos: unknown) {
  const datos = esquemaInsumo.extend({
    precioInicial: esquemaPrecioInicial.optional(),
  }).parse(datosCrudos);

  const [nuevoInsumo] = await db
    .insert(insumo)
    .values({
      codigo: datos.codigo,
      descripcion: datos.descripcion,
      unidad: datos.unidad,
      tipo: datos.tipo,
    })
    .returning();

  if (datos.precioInicial) {
    await db.insert(precioInsumo).values({
      insumoId: nuevoInsumo.id,
      fechaVigencia: datos.precioInicial.fechaVigencia,
      precio: datos.precioInicial.precio,
      fuente: datos.precioInicial.fuente ?? null,
    });
  }

  revalidatePath(RUTA);
  return nuevoInsumo;
}

export async function editarInsumo(id: number, datosCrudos: unknown) {
  const datos = esquemaInsumo.parse(datosCrudos);

  await db
    .update(insumo)
    .set({
      codigo: datos.codigo,
      descripcion: datos.descripcion,
      unidad: datos.unidad,
      tipo: datos.tipo,
    })
    .where(eq(insumo.id, id));

  revalidatePath(RUTA);
}

export async function cambiarActivoInsumo(id: number, activo: boolean) {
  await db.update(insumo).set({ activo }).where(eq(insumo.id, id));
  revalidatePath(RUTA);
}

export async function listarHistorialPrecios(insumoId: number) {
  return db
    .select()
    .from(precioInsumo)
    .where(eq(precioInsumo.insumoId, insumoId))
    .orderBy(desc(precioInsumo.fechaVigencia), desc(precioInsumo.id));
}

const esquemaNuevoPrecio = z.object({
  precio: z.number().positive("El precio tiene que ser mayor a cero"),
  fechaVigencia: z.string().min(1, "Falta la fecha de vigencia"),
  fuente: z.string().trim().optional(),
});

export async function agregarPrecio(insumoId: number, datosCrudos: unknown) {
  const datos = esquemaNuevoPrecio.parse(datosCrudos);

  await db.insert(precioInsumo).values({
    insumoId,
    fechaVigencia: datos.fechaVigencia,
    precio: datos.precio,
    fuente: datos.fuente ?? null,
  });

  revalidatePath(RUTA);
}

const esquemaActualizacionLote = z.object({
  insumoIds: z.array(z.number().int().positive()).min(1, "Elegí al menos un insumo"),
  porcentaje: z.number(),
  fechaVigencia: z.string().min(1, "Falta la fecha de vigencia"),
});

export async function actualizarPreciosEnLote(datosCrudos: unknown) {
  const datos = esquemaActualizacionLote.parse(datosCrudos);

  const precios = await db
    .select()
    .from(precioInsumo)
    .where(inArray(precioInsumo.insumoId, datos.insumoIds))
    .orderBy(precioInsumo.id);

  const hoy = hoyISO();
  const omitidos: { insumoId: number; motivo: string }[] = [];
  let actualizados = 0;

  for (const insumoId of datos.insumoIds) {
    const historial = precios
      .filter((p) => p.insumoId === insumoId)
      .map((p) => ({ fechaVigencia: p.fechaVigencia, precio: p.precio }));
    const vigente = obtenerPrecioVigente(historial, hoy);

    if (!vigente) {
      omitidos.push({ insumoId, motivo: "No tiene ningún precio cargado todavía" });
      continue;
    }

    const nuevoPrecio = Math.round(vigente.precio * (1 + datos.porcentaje / 100) * 100) / 100;

    await db.insert(precioInsumo).values({
      insumoId,
      fechaVigencia: datos.fechaVigencia,
      precio: nuevoPrecio,
      fuente: `Actualización en lote (${datos.porcentaje > 0 ? "+" : ""}${datos.porcentaje}%)`,
    });
    actualizados += 1;
  }

  revalidatePath(RUTA);
  return { actualizados, omitidos };
}
