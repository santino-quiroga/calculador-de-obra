// Función pura (no "use server": Next.js exige que todo lo exportado desde
// un archivo "use server" sea async, y esto no toca la base). Separada de
// plan-trabajos.ts solo por eso — la usan tanto el plan de trabajos como el
// control de obra (Fase 7) para traducir el plan a tareas del motor de curvas.

import type { TareaParaCurva, TipoCurva } from "@/lib/calculo/curva-inversion";
import type { listarPlanDeTrabajos } from "@/lib/acciones/plan-trabajos";

type Plan = Awaited<ReturnType<typeof listarPlanDeTrabajos>>;

export interface TareaDelPlan extends TareaParaCurva {
  rubroId: number;
}

export function construirTareasDelPlan(plan: NonNullable<Plan>): TareaDelPlan[] {
  const tareas: TareaDelPlan[] = [];
  for (const rubro of plan.rubros) {
    for (const item of rubro.items) {
      if (!item.tarea) continue;
      tareas.push({
        id: item.tarea.id,
        rubroId: rubro.rubroId,
        fechaInicio: item.tarea.fechaInicio,
        fechaFin: item.tarea.fechaFin,
        monto: item.precioTotal,
        curva: item.tarea.curva as TipoCurva,
        distribucionManual: item.tarea.distribucionManual,
      });
    }
    if (rubro.tarea) {
      tareas.push({
        id: rubro.tarea.id,
        rubroId: rubro.rubroId,
        fechaInicio: rubro.tarea.fechaInicio,
        fechaFin: rubro.tarea.fechaFin,
        monto: rubro.montoNeto,
        curva: rubro.tarea.curva as TipoCurva,
        distribucionManual: rubro.tarea.distribucionManual,
      });
    }
  }
  return tareas;
}
