// Numeración jerárquica y totales del presupuesto (CLAUDE.md 6.3). Funciones
// puras: no tocan la base, no conocen precios — reciben ya resuelto el
// precio de venta de cada ítem (que sale del motor de la Fase 2,
// lib/acciones/catalogo.ts#calcularApuDeItem).

export interface GrupoRubro {
  rubroId: number;
  itemIds: number[]; // ya en el orden de exhibición dentro del rubro
}

export interface RubroNumerado {
  rubroId: number;
  nroRubro: string; // "1", "2", ...
  items: { id: number; nroItem: string }[]; // "1.1", "1.2", ...
}

export function asignarNumerosJerarquicos(grupos: GrupoRubro[]): RubroNumerado[] {
  return grupos.map((grupo, indiceRubro) => {
    const nroRubro = String(indiceRubro + 1);
    return {
      rubroId: grupo.rubroId,
      nroRubro,
      items: grupo.itemIds.map((id, indiceItem) => ({
        id,
        nroItem: `${nroRubro}.${indiceItem + 1}`,
      })),
    };
  });
}

export interface ItemPresupuestoInput {
  id: number;
  rubroId: number;
  cantidad: number;
  precioUnitario: number;
}

export interface ItemPresupuestoCalculado extends ItemPresupuestoInput {
  precioTotal: number;
  incidenciaPct: number;
}

export interface ResumenPresupuesto {
  items: ItemPresupuestoCalculado[];
  subtotalesPorRubro: Map<number, number>;
  totalPresupuesto: number;
}

export function calcularResumenPresupuesto(items: ItemPresupuestoInput[]): ResumenPresupuesto {
  const itemsConTotal = items.map((item) => ({
    ...item,
    precioTotal: item.cantidad * item.precioUnitario,
  }));

  const totalPresupuesto = itemsConTotal.reduce((suma, item) => suma + item.precioTotal, 0);

  const subtotalesPorRubro = new Map<number, number>();
  for (const item of itemsConTotal) {
    subtotalesPorRubro.set(item.rubroId, (subtotalesPorRubro.get(item.rubroId) ?? 0) + item.precioTotal);
  }

  const itemsCalculados = itemsConTotal.map((item) => ({
    ...item,
    incidenciaPct: totalPresupuesto === 0 ? 0 : (item.precioTotal / totalPresupuesto) * 100,
  }));

  return { items: itemsCalculados, subtotalesPorRubro, totalPresupuesto };
}
