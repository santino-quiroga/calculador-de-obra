"use server";

// Plan de trabajos (Gantt) y curva de inversión teórica (Fase 6, CLAUDE.md
// 6.4). Cada rubro del presupuesto arranca como una barra (plan_tarea con
// rubroId, presupuestoItemId null); al desplegar un rubro, un ítem puede
// tener su propia barra (plan_tarea con presupuestoItemId). El monto que
// representa la barra del rubro es siempre "subtotal del rubro menos lo que
// ya se desagregó a nivel ítem" (montoNetoRubro), para que el total nunca
// se duplique ni se pierda sin importar cuánto se desagregue.

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/client";
import { planTarea } from "@/lib/db/schema";
import { listarPresupuesto } from "@/lib/acciones/presupuesto";
import { construirTareasDelPlan } from "@/lib/acciones/plan-trabajos-helpers";
import {
  calcularCurvaTeorica,
  montoNetoRubro,
  validarDistribucionManual,
  type Granularidad,
} from "@/lib/calculo/curva-inversion";
import { sumarDias } from "@/lib/formato";

const RUTA = "/plan-trabajos";
const DURACION_INICIAL_DIAS = 30;

function aTareaFila(fila: typeof planTarea.$inferSelect) {
  return {
    id: fila.id,
    fechaInicio: fila.fechaInicio,
    fechaFin: fila.fechaFin,
    curva: fila.curva,
    distribucionManual: fila.distribucionManualJson
      ? (JSON.parse(fila.distribucionManualJson) as Record<string, number>)
      : null,
  };
}

export async function listarPlanDeTrabajos(obraId: number) {
  const presupuesto = await listarPresupuesto(obraId);
  if (!presupuesto) return null;

  const tareasDb = await db.select().from(planTarea).where(eq(planTarea.obraId, obraId));

  const tareaRubroPorId = new Map<number, ReturnType<typeof aTareaFila>>();
  const tareaItemPorId = new Map<number, ReturnType<typeof aTareaFila>>();
  for (const fila of tareasDb) {
    if (fila.presupuestoItemId !== null) {
      tareaItemPorId.set(fila.presupuestoItemId, aTareaFila(fila));
    } else if (fila.rubroId !== null) {
      tareaRubroPorId.set(fila.rubroId, aTareaFila(fila));
    }
  }

  const rubros = presupuesto.rubros.map((rubro) => {
    const items = rubro.items.map((item) => ({
      id: item.id,
      nroItem: item.nroItem,
      descripcion: item.descripcion,
      unidad: item.unidad,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      precioTotal: item.precioTotal,
      tarea: tareaItemPorId.get(item.id) ?? null,
    }));

    const tarea = tareaRubroPorId.get(rubro.rubroId) ?? null;
    const montoNeto = montoNetoRubro(
      rubro.subtotal,
      items.filter((item) => item.tarea !== null).map((item) => item.precioTotal)
    );

    return {
      rubroId: rubro.rubroId,
      nroRubro: rubro.nroRubro,
      nombre: rubro.nombre,
      subtotal: rubro.subtotal,
      montoNeto,
      tarea,
      items,
      sinPlanificar: tarea === null && montoNeto > 0,
    };
  });

  return {
    obra: presupuesto.obra,
    totalPresupuesto: presupuesto.totalPresupuesto,
    rubros,
  };
}

const esquemaGenerarPlanInicial = z.object({
  fechaInicio: z.string().min(1, "Falta la fecha de inicio"),
});

// Crea una tarea a nivel rubro para cada rubro del presupuesto que todavía
// no tiene una — una atrás de la otra, 30 días cada una. Es seguro llamarla
// de nuevo (por ejemplo si se agregó un rubro nuevo al presupuesto): a los
// rubros ya planificados no los toca, y los nuevos arrancan después de la
// última tarea existente.
export async function generarPlanInicial(obraId: number, datosCrudos: unknown) {
  const datos = esquemaGenerarPlanInicial.parse(datosCrudos);

  const [presupuesto, tareasDb] = await Promise.all([
    listarPresupuesto(obraId),
    db.select().from(planTarea).where(eq(planTarea.obraId, obraId)),
  ]);
  if (!presupuesto) throw new Error("La obra no existe");

  const rubroIdsPlanificados = new Set(
    tareasDb.filter((t) => t.presupuestoItemId === null && t.rubroId !== null).map((t) => t.rubroId!)
  );
  const fechasFinExistentes = tareasDb.map((t) => t.fechaFin);
  let cursor =
    fechasFinExistentes.length > 0
      ? sumarDias(fechasFinExistentes.sort().at(-1)!, 1)
      : datos.fechaInicio;

  for (const rubro of presupuesto.rubros) {
    if (rubroIdsPlanificados.has(rubro.rubroId)) continue;

    const fechaFin = sumarDias(cursor, DURACION_INICIAL_DIAS - 1);
    await db.insert(planTarea).values({
      obraId,
      rubroId: rubro.rubroId,
      presupuestoItemId: null,
      fechaInicio: cursor,
      fechaFin,
      curva: "lineal",
    });
    cursor = sumarDias(fechaFin, 1);
  }

  revalidatePath(RUTA);
}

const esquemaCrearTareaDeItem = z.object({
  presupuestoItemId: z.number().int().positive(),
  rubroId: z.number().int().positive(),
  fechaInicio: z.string().min(1, "Falta la fecha de inicio"),
  fechaFin: z.string().min(1, "Falta la fecha de fin"),
});

export async function crearTareaDeItem(obraId: number, datosCrudos: unknown) {
  const datos = esquemaCrearTareaDeItem.parse(datosCrudos);
  if (datos.fechaInicio > datos.fechaFin) {
    throw new Error("La fecha de inicio tiene que ser anterior o igual a la de fin");
  }

  await db.insert(planTarea).values({
    obraId,
    rubroId: datos.rubroId,
    presupuestoItemId: datos.presupuestoItemId,
    fechaInicio: datos.fechaInicio,
    fechaFin: datos.fechaFin,
    curva: "lineal",
  });

  revalidatePath(RUTA);
}

export async function eliminarTarea(id: number) {
  await db.delete(planTarea).where(eq(planTarea.id, id));
  revalidatePath(RUTA);
}

const esquemaFechasTarea = z
  .object({
    fechaInicio: z.string().min(1, "Falta la fecha de inicio"),
    fechaFin: z.string().min(1, "Falta la fecha de fin"),
  })
  .refine((datos) => datos.fechaInicio <= datos.fechaFin, {
    message: "La fecha de inicio tiene que ser anterior o igual a la de fin",
    path: ["fechaFin"],
  });

export async function actualizarFechasTarea(id: number, datosCrudos: unknown) {
  const datos = esquemaFechasTarea.parse(datosCrudos);
  await db
    .update(planTarea)
    .set({ fechaInicio: datos.fechaInicio, fechaFin: datos.fechaFin })
    .where(eq(planTarea.id, id));
  revalidatePath(RUTA);
}

const esquemaCurvaTarea = z.object({
  curva: z.enum(["lineal", "campana", "manual"]),
  distribucionManual: z.record(z.string(), z.number()).nullable().optional(),
});

export async function cambiarCurvaTarea(id: number, datosCrudos: unknown) {
  const datos = esquemaCurvaTarea.parse(datosCrudos);

  if (datos.curva === "manual") {
    if (!datos.distribucionManual || !validarDistribucionManual(datos.distribucionManual)) {
      throw new Error("Los porcentajes cargados a mano tienen que sumar 100%");
    }
  }

  await db
    .update(planTarea)
    .set({
      curva: datos.curva,
      distribucionManualJson: datos.curva === "manual" ? JSON.stringify(datos.distribucionManual) : null,
    })
    .where(eq(planTarea.id, id));

  revalidatePath(RUTA);
}

export async function calcularCurvaTeoricaDeObra(obraId: number, granularidad: Granularidad) {
  const plan = await listarPlanDeTrabajos(obraId);
  if (!plan) return null;

  return {
    curva: calcularCurvaTeorica(construirTareasDelPlan(plan), granularidad),
    totalPresupuesto: plan.totalPresupuesto,
  };
}
