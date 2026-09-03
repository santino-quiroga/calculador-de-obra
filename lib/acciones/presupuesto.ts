"use server";

// Orquesta el presupuesto de una obra: junta ítems + el motor de cálculo de
// la Fase 2 (calcularApuDeItem) para el precio de venta de cada uno a la
// fecha base de la obra, y arma el desglose con las funciones puras de
// lib/calculo/presupuesto.ts. Acá no vive ninguna fórmula de costeo nueva.

import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/client";
import {
  apuSnapshot,
  componenteApu,
  componentePresupuestoItem,
  insumo,
  itemCatalogo,
  obra,
  presupuestoItem,
  rubro,
} from "@/lib/db/schema";
import { calcularApuDeItem, calcularApuDesdeComponentes } from "@/lib/acciones/catalogo";
import { esquemaComponente, normalizarComponente } from "@/lib/acciones/componente-apu-comun";
import { obtenerObra } from "@/lib/acciones/obras";
import { asignarNumerosJerarquicos, calcularResumenPresupuesto } from "@/lib/calculo/presupuesto";
import { hoyISO } from "@/lib/formato";

async function sincronizarNumeracion(obraId: number) {
  const [items, rubros] = await Promise.all([
    db.select().from(presupuestoItem).where(eq(presupuestoItem.obraId, obraId)).orderBy(presupuestoItem.orden),
    db.select().from(rubro),
  ]);

  const ordenPorRubro = new Map(rubros.map((r) => [r.id, r.orden]));
  const rubroIds = [...new Set(items.map((i) => i.rubroId))].sort(
    (a, b) => (ordenPorRubro.get(a) ?? 0) - (ordenPorRubro.get(b) ?? 0)
  );

  const grupos = rubroIds.map((rubroId) => ({
    rubroId,
    itemIds: items.filter((i) => i.rubroId === rubroId).map((i) => i.id),
  }));

  const numerados = asignarNumerosJerarquicos(grupos);

  for (const grupoNumerado of numerados) {
    for (const item of grupoNumerado.items) {
      await db.update(presupuestoItem).set({ nroItem: item.nroItem }).where(eq(presupuestoItem.id, item.id));
    }
  }
}

export async function listarPresupuesto(obraId: number) {
  const obraFila = await obtenerObra(obraId);
  if (!obraFila) return null;

  const [itemsDb, rubrosDb] = await Promise.all([
    db.select().from(presupuestoItem).where(eq(presupuestoItem.obraId, obraId)).orderBy(presupuestoItem.orden),
    db.select().from(rubro),
  ]);

  const rubroPorId = new Map(rubrosDb.map((r) => [r.id, r]));

  const itemIds = itemsDb.map((i) => i.id);
  const snapshotsDb =
    itemIds.length > 0
      ? await db.select().from(apuSnapshot).where(inArray(apuSnapshot.presupuestoItemId, itemIds)).orderBy(apuSnapshot.id)
      : [];
  // Si un ítem se re-presentó más de una vez, se queda con el snapshot más
  // reciente (el orderBy asc + sobreescritura en el Map hace que gane el último).
  const snapshotPorItem = new Map<number, (typeof snapshotsDb)[number]>();
  for (const snap of snapshotsDb) {
    snapshotPorItem.set(snap.presupuestoItemId, snap);
  }

  const preciosPorItem = new Map<number, number>();
  for (const item of itemsDb) {
    const snapshot = snapshotPorItem.get(item.id);
    if (snapshot) {
      preciosPorItem.set(item.id, snapshot.costoUnitarioCongelado);
      continue;
    }

    if (item.itemCatalogoId === null) {
      const calculo = await calcularApuDeItemManual(item.id, obraFila.fechaBasePrecios);
      preciosPorItem.set(item.id, calculo.coeficiente?.precioFinal ?? calculo.apu.costoDirecto);
      continue;
    }

    const calculo = await calcularApuDeItem(item.itemCatalogoId, obraFila.fechaBasePrecios);
    preciosPorItem.set(item.id, calculo.coeficiente?.precioFinal ?? calculo.apu.costoDirecto);
  }

  const resumen = calcularResumenPresupuesto(
    itemsDb.map((item) => ({
      id: item.id,
      rubroId: item.rubroId,
      cantidad: item.cantidad,
      precioUnitario: preciosPorItem.get(item.id) ?? 0,
    }))
  );
  const resumenPorId = new Map(resumen.items.map((i) => [i.id, i]));
  const itemPorId = new Map(itemsDb.map((i) => [i.id, i]));

  const rubroIds = [...new Set(itemsDb.map((i) => i.rubroId))].sort(
    (a, b) => (rubroPorId.get(a)?.orden ?? 0) - (rubroPorId.get(b)?.orden ?? 0)
  );
  const grupos = rubroIds.map((rubroId) => ({
    rubroId,
    itemIds: itemsDb.filter((i) => i.rubroId === rubroId).map((i) => i.id),
  }));

  const rubrosPresupuesto = asignarNumerosJerarquicos(grupos).map((grupoNumerado) => {
    const subtotal = resumen.subtotalesPorRubro.get(grupoNumerado.rubroId) ?? 0;
    return {
      rubroId: grupoNumerado.rubroId,
      nroRubro: grupoNumerado.nroRubro,
      nombre: rubroPorId.get(grupoNumerado.rubroId)?.nombre ?? "—",
      subtotal,
      incidenciaPct: resumen.totalPresupuesto === 0 ? 0 : (subtotal / resumen.totalPresupuesto) * 100,
      items: grupoNumerado.items.map(({ id, nroItem }) => {
        const item = itemPorId.get(id)!;
        const calculado = resumenPorId.get(id)!;
        return {
          id,
          nroItem,
          rubroId: grupoNumerado.rubroId,
          descripcion: item.descripcion,
          unidad: item.unidad,
          cantidad: item.cantidad,
          itemCatalogoId: item.itemCatalogoId,
          precioUnitario: calculado.precioUnitario,
          precioTotal: calculado.precioTotal,
          incidenciaPct: calculado.incidenciaPct,
          congelado: snapshotPorItem.has(item.id),
        };
      }),
    };
  });

  return {
    obra: obraFila,
    rubros: rubrosPresupuesto,
    totalPresupuesto: resumen.totalPresupuesto,
  };
}

const esquemaAgregarItem = z.object({
  rubroId: z.number().int().positive("Elegí un rubro"),
  itemCatalogoId: z.number().int().positive("Elegí un ítem"),
  cantidad: z.number().positive("La cantidad tiene que ser mayor a cero"),
});

export async function agregarItemPresupuesto(obraId: number, datosCrudos: unknown) {
  const datos = esquemaAgregarItem.parse(datosCrudos);

  const [item] = await db.select().from(itemCatalogo).where(eq(itemCatalogo.id, datos.itemCatalogoId));
  if (!item) throw new Error("El ítem de catálogo no existe");

  const itemsDelRubro = await db
    .select()
    .from(presupuestoItem)
    .where(and(eq(presupuestoItem.obraId, obraId), eq(presupuestoItem.rubroId, datos.rubroId)));
  const siguienteOrden =
    itemsDelRubro.length === 0 ? 0 : Math.max(...itemsDelRubro.map((i) => i.orden)) + 1;

  await db.insert(presupuestoItem).values({
    obraId,
    nroItem: "", // se completa en sincronizarNumeracion, más abajo
    rubroId: datos.rubroId,
    itemCatalogoId: datos.itemCatalogoId,
    descripcion: item.descripcion,
    unidad: item.unidad,
    cantidad: datos.cantidad,
    orden: siguienteOrden,
  });

  await sincronizarNumeracion(obraId);
  revalidatePath(`/obras/${obraId}`);
}

export async function editarCantidadPresupuesto(id: number, cantidad: number) {
  if (!(cantidad > 0)) {
    throw new Error("La cantidad tiene que ser mayor a cero");
  }

  const [item] = await db.select().from(presupuestoItem).where(eq(presupuestoItem.id, id));
  if (!item) throw new Error("El ítem de presupuesto no existe");

  await db.update(presupuestoItem).set({ cantidad }).where(eq(presupuestoItem.id, id));
  revalidatePath(`/obras/${item.obraId}`);
}

export async function eliminarItemPresupuesto(id: number) {
  const [item] = await db.select().from(presupuestoItem).where(eq(presupuestoItem.id, id));
  if (!item) return;

  await db.delete(presupuestoItem).where(eq(presupuestoItem.id, id));
  await sincronizarNumeracion(item.obraId);
  revalidatePath(`/obras/${item.obraId}`);
}

// ---------------------------------------------------------------------------
// Ítem manual (Fase 5): "Ítem nuevo" en el presupuesto, con receta propia
// cargada en componente_presupuesto_item hasta que el usuario decide
// "Guardar en catálogo" (promoverItemManualACatalogo) o usar un ítem
// existente parecido (usarItemCatalogoExistente).
// ---------------------------------------------------------------------------

const esquemaAgregarItemManual = z.object({
  rubroId: z.number().int().positive("Elegí un rubro"),
  descripcion: z.string().trim().min(1, "Falta la descripción"),
  unidad: z.enum(["m2", "m3", "ml", "u", "gl", "kg"]),
  cantidad: z.number().positive("La cantidad tiene que ser mayor a cero"),
});

export async function agregarItemManualPresupuesto(obraId: number, datosCrudos: unknown) {
  const datos = esquemaAgregarItemManual.parse(datosCrudos);

  const itemsDelRubro = await db
    .select()
    .from(presupuestoItem)
    .where(and(eq(presupuestoItem.obraId, obraId), eq(presupuestoItem.rubroId, datos.rubroId)));
  const siguienteOrden =
    itemsDelRubro.length === 0 ? 0 : Math.max(...itemsDelRubro.map((i) => i.orden)) + 1;

  const [nuevo] = await db
    .insert(presupuestoItem)
    .values({
      obraId,
      nroItem: "", // se completa en sincronizarNumeracion, más abajo
      rubroId: datos.rubroId,
      itemCatalogoId: null,
      descripcion: datos.descripcion,
      unidad: datos.unidad,
      cantidad: datos.cantidad,
      orden: siguienteOrden,
    })
    .returning();

  await sincronizarNumeracion(obraId);
  revalidatePath(`/obras/${obraId}`);
  return nuevo;
}

async function obtenerObraIdDePresupuestoItem(presupuestoItemId: number) {
  const [item] = await db
    .select({ obraId: presupuestoItem.obraId })
    .from(presupuestoItem)
    .where(eq(presupuestoItem.id, presupuestoItemId));
  return item?.obraId ?? null;
}

export async function obtenerItemManualPresupuesto(presupuestoItemId: number) {
  const [item] = await db.select().from(presupuestoItem).where(eq(presupuestoItem.id, presupuestoItemId));
  if (!item) return null;

  const componentes = await db
    .select({
      id: componentePresupuestoItem.id,
      insumoId: componentePresupuestoItem.insumoId,
      tipo: componentePresupuestoItem.tipo,
      cantidadUnitaria: componentePresupuestoItem.cantidadUnitaria,
      desperdicioPct: componentePresupuestoItem.desperdicioPct,
      rendimientoHoras: componentePresupuestoItem.rendimientoHoras,
      observacion: componentePresupuestoItem.observacion,
      insumoCodigo: insumo.codigo,
      insumoDescripcion: insumo.descripcion,
      insumoUnidad: insumo.unidad,
    })
    .from(componentePresupuestoItem)
    .innerJoin(insumo, eq(componentePresupuestoItem.insumoId, insumo.id))
    .where(eq(componentePresupuestoItem.presupuestoItemId, presupuestoItemId));

  return { item, componentes };
}

export async function agregarComponenteManual(presupuestoItemId: number, datosCrudos: unknown) {
  const datos = esquemaComponente.parse(datosCrudos);

  const [nuevo] = await db
    .insert(componentePresupuestoItem)
    .values({ presupuestoItemId, ...normalizarComponente(datos) })
    .returning();

  const obraId = await obtenerObraIdDePresupuestoItem(presupuestoItemId);
  if (obraId) revalidatePath(`/obras/${obraId}`);
  return nuevo;
}

export async function editarComponenteManual(id: number, datosCrudos: unknown) {
  const datos = esquemaComponente.parse(datosCrudos);

  const [fila] = await db.select().from(componentePresupuestoItem).where(eq(componentePresupuestoItem.id, id));
  await db
    .update(componentePresupuestoItem)
    .set(normalizarComponente(datos))
    .where(eq(componentePresupuestoItem.id, id));

  if (fila) {
    const obraId = await obtenerObraIdDePresupuestoItem(fila.presupuestoItemId);
    if (obraId) revalidatePath(`/obras/${obraId}`);
  }
}

export async function eliminarComponenteManual(id: number) {
  const [fila] = await db.select().from(componentePresupuestoItem).where(eq(componentePresupuestoItem.id, id));
  await db.delete(componentePresupuestoItem).where(eq(componentePresupuestoItem.id, id));

  if (fila) {
    const obraId = await obtenerObraIdDePresupuestoItem(fila.presupuestoItemId);
    if (obraId) revalidatePath(`/obras/${obraId}`);
  }
}

export async function calcularApuDeItemManual(presupuestoItemId: number, fecha: string) {
  const componentesDb = await db
    .select()
    .from(componentePresupuestoItem)
    .where(eq(componentePresupuestoItem.presupuestoItemId, presupuestoItemId));

  return calcularApuDesdeComponentes(componentesDb, fecha);
}

const esquemaPromoverACatalogo = z.object({
  codigo: z.string().trim().min(1, "Falta el código"),
});

// Captura la receta cargada a mano y la vuelve reutilizable: crea el
// item_catalogo (origen='usuario'), copia las líneas, engancha esta línea
// del presupuesto al ítem nuevo, y borra la receta suelta.
export async function promoverItemManualACatalogo(presupuestoItemId: number, datosCrudos: unknown) {
  const datos = esquemaPromoverACatalogo.parse(datosCrudos);

  const [item] = await db.select().from(presupuestoItem).where(eq(presupuestoItem.id, presupuestoItemId));
  if (!item) throw new Error("El ítem del presupuesto no existe");
  if (item.itemCatalogoId !== null) throw new Error("Este ítem ya está enganchado al catálogo");

  const componentes = await db
    .select()
    .from(componentePresupuestoItem)
    .where(eq(componentePresupuestoItem.presupuestoItemId, presupuestoItemId));

  const [nuevoItemCatalogo] = await db
    .insert(itemCatalogo)
    .values({
      codigo: datos.codigo,
      rubroId: item.rubroId,
      descripcion: item.descripcion,
      unidad: item.unidad as "m2" | "m3" | "ml" | "u" | "gl" | "kg",
      origen: "usuario",
      creadoEn: hoyISO(),
    })
    .returning();

  for (const componente of componentes) {
    await db.insert(componenteApu).values({
      itemCatalogoId: nuevoItemCatalogo.id,
      insumoId: componente.insumoId,
      tipo: componente.tipo,
      cantidadUnitaria: componente.cantidadUnitaria,
      desperdicioPct: componente.desperdicioPct,
      rendimientoHoras: componente.rendimientoHoras,
      observacion: componente.observacion,
    });
  }

  await db.update(presupuestoItem).set({ itemCatalogoId: nuevoItemCatalogo.id }).where(eq(presupuestoItem.id, presupuestoItemId));
  await db.delete(componentePresupuestoItem).where(eq(componentePresupuestoItem.presupuestoItemId, presupuestoItemId));

  revalidatePath("/catalogo");
  revalidatePath(`/obras/${item.obraId}`);
  return nuevoItemCatalogo;
}

// Alternativa a promover: el usuario reconoce que ya existe un ítem
// parecido y prefiere usar ese en vez de crear uno nuevo. Descarta la
// receta suelta cargada a mano.
export async function usarItemCatalogoExistente(presupuestoItemId: number, itemCatalogoId: number) {
  const [item] = await db.select().from(presupuestoItem).where(eq(presupuestoItem.id, presupuestoItemId));
  if (!item) throw new Error("El ítem del presupuesto no existe");

  const [itemDeCatalogo] = await db.select().from(itemCatalogo).where(eq(itemCatalogo.id, itemCatalogoId));
  if (!itemDeCatalogo) throw new Error("El ítem de catálogo no existe");

  await db
    .update(presupuestoItem)
    .set({ itemCatalogoId, descripcion: itemDeCatalogo.descripcion, unidad: itemDeCatalogo.unidad })
    .where(eq(presupuestoItem.id, presupuestoItemId));
  await db.delete(componentePresupuestoItem).where(eq(componentePresupuestoItem.presupuestoItemId, presupuestoItemId));

  revalidatePath(`/obras/${item.obraId}`);
}

// ---------------------------------------------------------------------------
// Snapshot al presentar (CLAUDE.md 4.3): congela la composición completa de
// cada APU del presupuesto con los precios usados en ese momento. A partir
// de ahí, listarPresupuesto lee el snapshot en vez de recalcular en vivo —
// cambiar el catálogo o los precios después no puede alterar lo presentado.
// Si la obra se vuelve a marcar "Presentada" más adelante (una corrección),
// se regenera con los valores de ese momento.
// ---------------------------------------------------------------------------

export async function presentarObra(obraId: number) {
  const obraFila = await obtenerObra(obraId);
  if (!obraFila) throw new Error("La obra no existe");

  const itemsDb = await db.select().from(presupuestoItem).where(eq(presupuestoItem.obraId, obraId));
  const fecha = hoyISO();

  const nuevosSnapshots: {
    presupuestoItemId: number;
    jsonComposicion: string;
    fechaSnapshot: string;
    costoUnitarioCongelado: number;
  }[] = [];

  for (const item of itemsDb) {
    const calculo =
      item.itemCatalogoId !== null
        ? await calcularApuDeItem(item.itemCatalogoId, obraFila.fechaBasePrecios)
        : await calcularApuDeItemManual(item.id, obraFila.fechaBasePrecios);

    nuevosSnapshots.push({
      presupuestoItemId: item.id,
      jsonComposicion: JSON.stringify(calculo),
      fechaSnapshot: fecha,
      costoUnitarioCongelado: calculo.coeficiente?.precioFinal ?? calculo.apu.costoDirecto,
    });
  }

  const itemIds = itemsDb.map((i) => i.id);
  if (itemIds.length > 0) {
    await db.delete(apuSnapshot).where(inArray(apuSnapshot.presupuestoItemId, itemIds));
  }
  for (const snapshot of nuevosSnapshots) {
    await db.insert(apuSnapshot).values(snapshot);
  }

  await db.update(obra).set({ estado: "presentado" }).where(eq(obra.id, obraId));

  revalidatePath("/obras");
  revalidatePath(`/obras/${obraId}`);
}

export async function obtenerSnapshotDeItem(presupuestoItemId: number) {
  const [snapshot] = await db
    .select()
    .from(apuSnapshot)
    .where(eq(apuSnapshot.presupuestoItemId, presupuestoItemId));
  if (!snapshot) return null;

  return {
    fechaSnapshot: snapshot.fechaSnapshot,
    calculo: JSON.parse(snapshot.jsonComposicion) as Awaited<ReturnType<typeof calcularApuDeItem>>,
  };
}

// Para imprimir/exportar la APU de una línea del presupuesto (Fase 8): el
// mismo criterio que listarPresupuesto — si ya tiene snapshot (obra
// presentada), esos son los números que se muestran; si no, se resuelve en
// vivo a la fecha base de la obra.
export async function obtenerApuResueltoDePresupuestoItem(presupuestoItemId: number) {
  const [item] = await db.select().from(presupuestoItem).where(eq(presupuestoItem.id, presupuestoItemId));
  if (!item) return null;

  const obraFila = await obtenerObra(item.obraId);
  if (!obraFila) return null;

  const rubroFila = (await db.select().from(rubro).where(eq(rubro.id, item.rubroId)))[0] ?? null;

  const snapshot = await obtenerSnapshotDeItem(presupuestoItemId);
  if (snapshot) {
    return {
      item,
      rubro: rubroFila,
      obra: obraFila,
      calculo: snapshot.calculo,
      fechaCalculo: snapshot.fechaSnapshot,
      congelado: true,
    };
  }

  const calculo =
    item.itemCatalogoId !== null
      ? await calcularApuDeItem(item.itemCatalogoId, obraFila.fechaBasePrecios)
      : await calcularApuDeItemManual(item.id, obraFila.fechaBasePrecios);

  return { item, rubro: rubroFila, obra: obraFila, calculo, fechaCalculo: obraFila.fechaBasePrecios, congelado: false };
}

export async function reordenarItemsDeRubro(obraId: number, rubroId: number, idsEnNuevoOrden: number[]) {
  for (let indice = 0; indice < idsEnNuevoOrden.length; indice++) {
    await db
      .update(presupuestoItem)
      .set({ orden: indice })
      .where(
        and(
          eq(presupuestoItem.id, idsEnNuevoOrden[indice]),
          eq(presupuestoItem.obraId, obraId),
          eq(presupuestoItem.rubroId, rubroId)
        )
      );
  }

  await sincronizarNumeracion(obraId);
  revalidatePath(`/obras/${obraId}`);
}
