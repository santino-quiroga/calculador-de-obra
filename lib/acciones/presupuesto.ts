"use server";

// Orquesta el presupuesto de una obra: junta ítems + el motor de cálculo de
// la Fase 2 (calcularApuDeItem) para el precio de venta de cada uno a la
// fecha base de la obra, y arma el desglose con las funciones puras de
// lib/calculo/presupuesto.ts. Acá no vive ninguna fórmula de costeo nueva.

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/client";
import { itemCatalogo, presupuestoItem, rubro } from "@/lib/db/schema";
import { calcularApuDeItem } from "@/lib/acciones/catalogo";
import { obtenerObra } from "@/lib/acciones/obras";
import { asignarNumerosJerarquicos, calcularResumenPresupuesto } from "@/lib/calculo/presupuesto";

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

  const preciosPorItem = new Map<number, number>();
  for (const item of itemsDb) {
    if (item.itemCatalogoId === null) {
      preciosPorItem.set(item.id, 0);
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
          descripcion: item.descripcion,
          unidad: item.unidad,
          cantidad: item.cantidad,
          itemCatalogoId: item.itemCatalogoId,
          precioUnitario: calculado.precioUnitario,
          precioTotal: calculado.precioTotal,
          incidenciaPct: calculado.incidenciaPct,
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
