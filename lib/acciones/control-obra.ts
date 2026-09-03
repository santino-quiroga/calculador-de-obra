"use server";

// Control de obra (Fase 7, CLAUDE.md 6.4-6.5): avances reales por período,
// curva real superpuesta a la teórica, valor ganado (PV/EV/SPI/SV) y semáforo
// por rubro, con el panel de acciones correctivas.
//
// El avance siempre se carga en mes calendario ('YYYY-MM', igual que
// avance_real.periodo y certificado.periodo) — es independiente de la escala
// mensual/semanal que se elija para mirar el Gantt en Plan de trabajos. Un
// avance es "lo que se hizo ese mes" (no un acumulado): el sistema va
// sumando mes a mes para armar la curva real, igual que hace con la teórica.

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/client";
import { accionCorrectiva, avanceReal, planTarea } from "@/lib/db/schema";
import { listarPlanDeTrabajos } from "@/lib/acciones/plan-trabajos";
import { construirTareasDelPlan, type TareaDelPlan } from "@/lib/acciones/plan-trabajos-helpers";
import { calcularCurvaTeorica } from "@/lib/calculo/curva-inversion";
import { calcularCurvaReal, calcularDesviosPorRubro } from "@/lib/calculo/valor-ganado";
import { hoyISO } from "@/lib/formato";

const RUTA = "/control-obra";

interface InfoTarea {
  rubroId: number;
  esItem: boolean;
  montoContractual: number;
  cantidadContractual: number | null;
  precioUnitario: number | null;
}

// Recalcula todo lo que hace falta para pintar la pantalla de control: las
// curvas teórica y real (generales y por rubro) y los desvíos con su
// semáforo, al último período con algún avance cargado en la obra.
async function calcularControl(obraId: number) {
  const plan = await listarPlanDeTrabajos(obraId);
  if (!plan) return null;

  const tareasCurva = construirTareasDelPlan(plan);

  const infoTareaPorId = new Map<number, InfoTarea>();
  for (const rubro of plan.rubros) {
    for (const item of rubro.items) {
      if (item.tarea) {
        infoTareaPorId.set(item.tarea.id, {
          rubroId: rubro.rubroId,
          esItem: true,
          montoContractual: item.precioTotal,
          cantidadContractual: item.cantidad,
          precioUnitario: item.precioUnitario,
        });
      }
    }
    if (rubro.tarea) {
      infoTareaPorId.set(rubro.tarea.id, {
        rubroId: rubro.rubroId,
        esItem: false,
        montoContractual: rubro.montoNeto,
        cantidadContractual: null,
        precioUnitario: null,
      });
    }
  }

  const avancesDb = await db
    .select({
      id: avanceReal.id,
      planTareaId: avanceReal.planTareaId,
      periodo: avanceReal.periodo,
      cantidadEjecutada: avanceReal.cantidadEjecutada,
      porcentajeEjecutado: avanceReal.porcentajeEjecutado,
      fechaCarga: avanceReal.fechaCarga,
      observacion: avanceReal.observacion,
    })
    .from(avanceReal)
    .innerJoin(planTarea, eq(avanceReal.planTareaId, planTarea.id))
    .where(eq(planTarea.obraId, obraId));

  // Cuánto vale de verdad lo ejecutado ese mes, a precio de contrato: si la
  // barra es de un ítem con cantidad conocida, cantidad × precio unitario;
  // si es de un rubro completo (sin una unidad física única), % × su monto.
  const avancesConMonto = avancesDb.map((avance) => {
    const info = infoTareaPorId.get(avance.planTareaId);
    const monto = !info
      ? 0
      : info.esItem && avance.cantidadEjecutada !== null && info.precioUnitario !== null
        ? avance.cantidadEjecutada * info.precioUnitario
        : ((avance.porcentajeEjecutado ?? 0) / 100) * info.montoContractual;
    return { ...avance, monto, rubroId: info?.rubroId ?? null };
  });

  const avancesPorTarea = new Map<number, typeof avancesDb>();
  for (const avance of avancesDb) {
    const lista = avancesPorTarea.get(avance.planTareaId) ?? [];
    lista.push(avance);
    avancesPorTarea.set(avance.planTareaId, lista);
  }

  const periodoCorte = avancesConMonto.length === 0 ? null : [...avancesConMonto].map((a) => a.periodo).sort().at(-1)!;

  const curvaTeoricaGeneral = calcularCurvaTeorica(tareasCurva, "mensual");
  const curvaRealGeneral = calcularCurvaReal(
    avancesConMonto.map((a) => ({ periodo: a.periodo, monto: a.monto })),
    plan.totalPresupuesto
  );

  const rubrosControl = plan.rubros.map((rubro) => {
    const tareasDelRubro: TareaDelPlan[] = tareasCurva.filter((t) => t.rubroId === rubro.rubroId);
    const curvaTeorica = calcularCurvaTeorica(tareasDelRubro, "mensual");
    const montoContractualRubro = tareasDelRubro.reduce((suma, t) => suma + t.monto, 0);
    const avancesDelRubro = avancesConMonto.filter((a) => a.rubroId === rubro.rubroId);
    const curvaReal = calcularCurvaReal(
      avancesDelRubro.map((a) => ({ periodo: a.periodo, monto: a.monto })),
      montoContractualRubro
    );
    return { rubroId: rubro.rubroId, nombre: rubro.nombre, curvaTeorica, curvaReal };
  });

  const desvios = periodoCorte
    ? calcularDesviosPorRubro({ periodoCorte, granularidad: "mensual", rubros: rubrosControl })
    : [];

  return { plan, infoTareaPorId, avancesPorTarea, curvaTeoricaGeneral, curvaRealGeneral, rubrosControl, periodoCorte, desvios };
}

// Cada rubro que cae en rojo genera (o actualiza) automáticamente su fila en
// el panel de acciones correctivas. Si un rubro deja de estar en rojo y
// todavía no se escribió nada en su fila, se borra sola — pero nunca se
// borra una fila donde el usuario ya cargó una acción, responsable o fecha
// (CLAUDE.md 4.5: los datos son sagrados).
async function sincronizarAccionesCorrectivas(obraId: number) {
  const control = await calcularControl(obraId);
  if (!control || !control.periodoCorte) return;
  const { periodoCorte, desvios } = control;

  const existentes = await db.select().from(accionCorrectiva).where(eq(accionCorrectiva.obraId, obraId));
  const existentePorRubro = new Map(existentes.map((a) => [a.rubroId, a]));

  for (const desvio of desvios) {
    const existente = existentePorRubro.get(desvio.rubroId);
    if (desvio.semaforo === "rojo") {
      if (existente) {
        await db
          .update(accionCorrectiva)
          .set({ periodo: periodoCorte, desvioPesos: desvio.sv, desvioDias: desvio.desvioDias ?? 0 })
          .where(eq(accionCorrectiva.id, existente.id));
      } else {
        await db.insert(accionCorrectiva).values({
          obraId,
          rubroId: desvio.rubroId,
          periodo: periodoCorte,
          desvioPesos: desvio.sv,
          desvioDias: desvio.desvioDias ?? 0,
          creadoEn: hoyISO(),
        });
      }
    } else if (existente && !existente.accionDecidida && !existente.responsable && !existente.fechaRevision) {
      await db.delete(accionCorrectiva).where(eq(accionCorrectiva.id, existente.id));
    }
  }
}

export async function listarControlDeObra(obraId: number) {
  const control = await calcularControl(obraId);
  if (!control) return null;
  const { plan, avancesPorTarea, curvaTeoricaGeneral, curvaRealGeneral, rubrosControl, periodoCorte, desvios } = control;

  const accionesDb = await db.select().from(accionCorrectiva).where(eq(accionCorrectiva.obraId, obraId));
  const accionPorRubro = new Map(accionesDb.map((a) => [a.rubroId, a]));
  const curvasPorRubro = new Map(rubrosControl.map((r) => [r.rubroId, r]));
  const desvioPorRubro = new Map(desvios.map((d) => [d.rubroId, d]));

  const rubros = plan.rubros.map((rubro) => {
    const desvio = desvioPorRubro.get(rubro.rubroId) ?? null;
    const curvas = curvasPorRubro.get(rubro.rubroId)!;
    return {
      rubroId: rubro.rubroId,
      nombre: rubro.nombre,
      tarea: rubro.tarea
        ? { ...rubro.tarea, monto: rubro.montoNeto, avances: avancesPorTarea.get(rubro.tarea.id) ?? [] }
        : null,
      items: rubro.items.map((item) => ({
        id: item.id,
        descripcion: item.descripcion,
        unidad: item.unidad,
        cantidad: item.cantidad,
        tarea: item.tarea
          ? { ...item.tarea, monto: item.precioTotal, avances: avancesPorTarea.get(item.tarea.id) ?? [] }
          : null,
      })),
      curvaTeorica: curvas.curvaTeorica,
      curvaReal: curvas.curvaReal,
      pv: desvio?.pv ?? 0,
      ev: desvio?.ev ?? 0,
      spi: desvio?.spi ?? null,
      sv: desvio?.sv ?? 0,
      desvioDias: desvio?.desvioDias ?? null,
      semaforo: desvio?.semaforo ?? "verde",
      accion: accionPorRubro.get(rubro.rubroId) ?? null,
    };
  });

  return {
    obra: plan.obra,
    totalPresupuesto: plan.totalPresupuesto,
    periodoCorte,
    curvaTeoricaGeneral,
    curvaRealGeneral,
    rubros,
  };
}

const esquemaCargarAvance = z
  .object({
    periodo: z.string().regex(/^\d{4}-\d{2}$/, "El período tiene que ser un mes (AAAA-MM)"),
    cantidadEjecutada: z.number().nonnegative().nullable().optional(),
    porcentajeEjecutado: z.number().min(0).max(100).nullable().optional(),
    observacion: z.string().trim().optional(),
  })
  .refine((datos) => (datos.cantidadEjecutada ?? null) !== null || (datos.porcentajeEjecutado ?? null) !== null, {
    message: "Cargá una cantidad ejecutada o un porcentaje",
    path: ["cantidadEjecutada"],
  });

export async function cargarAvancePeriodo(planTareaId: number, datosCrudos: unknown) {
  const datos = esquemaCargarAvance.parse(datosCrudos);

  const [tareaDb] = await db.select().from(planTarea).where(eq(planTarea.id, planTareaId));
  if (!tareaDb) throw new Error("La tarea no existe");

  const control = await calcularControl(tareaDb.obraId);
  const info = control?.infoTareaPorId.get(planTareaId);
  if (!info) throw new Error("La tarea no existe");

  let cantidadEjecutada = datos.cantidadEjecutada ?? null;
  let porcentajeEjecutado = datos.porcentajeEjecutado ?? null;

  if (info.esItem && info.cantidadContractual) {
    if (cantidadEjecutada !== null && porcentajeEjecutado === null) {
      porcentajeEjecutado = (cantidadEjecutada / info.cantidadContractual) * 100;
    } else if (porcentajeEjecutado !== null && cantidadEjecutada === null) {
      cantidadEjecutada = (porcentajeEjecutado / 100) * info.cantidadContractual;
    }
  } else {
    // Barra de un rubro completo: agrupa ítems de distinta unidad, no hay
    // una "cantidad ejecutada" que tenga sentido — solo el porcentaje.
    if (porcentajeEjecutado === null) {
      throw new Error("Esta barra agrupa un rubro completo: cargá el porcentaje de avance");
    }
    cantidadEjecutada = null;
  }

  const [existente] = await db
    .select()
    .from(avanceReal)
    .where(and(eq(avanceReal.planTareaId, planTareaId), eq(avanceReal.periodo, datos.periodo)));

  if (existente) {
    await db
      .update(avanceReal)
      .set({
        cantidadEjecutada,
        porcentajeEjecutado,
        observacion: datos.observacion || null,
        fechaCarga: hoyISO(),
      })
      .where(eq(avanceReal.id, existente.id));
  } else {
    await db.insert(avanceReal).values({
      planTareaId,
      periodo: datos.periodo,
      cantidadEjecutada,
      porcentajeEjecutado,
      observacion: datos.observacion || null,
      fechaCarga: hoyISO(),
    });
  }

  await sincronizarAccionesCorrectivas(tareaDb.obraId);
  revalidatePath(RUTA);
}

export async function eliminarAvancePeriodo(id: number) {
  const [fila] = await db.select().from(avanceReal).where(eq(avanceReal.id, id));
  if (!fila) return;
  const [tareaDb] = await db.select().from(planTarea).where(eq(planTarea.id, fila.planTareaId));

  await db.delete(avanceReal).where(eq(avanceReal.id, id));

  if (tareaDb) await sincronizarAccionesCorrectivas(tareaDb.obraId);
  revalidatePath(RUTA);
}

const esquemaAccionCorrectiva = z.object({
  accionDecidida: z.string().trim().optional(),
  responsable: z.string().trim().optional(),
  fechaRevision: z.string().optional(),
});

// Upsert por (obraId, rubroId) en vez de por id: así la pantalla puede
// guardar la acción decidida aunque la fila automática todavía no se haya
// generado (por ejemplo, la primera vez que se abre la obra después de
// cargar avances desde otra sesión).
export async function guardarAccionCorrectiva(obraId: number, rubroId: number, datosCrudos: unknown) {
  const datos = esquemaAccionCorrectiva.parse(datosCrudos);
  const campos = {
    accionDecidida: datos.accionDecidida || null,
    responsable: datos.responsable || null,
    fechaRevision: datos.fechaRevision || null,
  };

  const [existente] = await db
    .select()
    .from(accionCorrectiva)
    .where(and(eq(accionCorrectiva.obraId, obraId), eq(accionCorrectiva.rubroId, rubroId)));

  if (existente) {
    await db.update(accionCorrectiva).set(campos).where(eq(accionCorrectiva.id, existente.id));
  } else {
    const control = await calcularControl(obraId);
    const desvio = control?.desvios.find((d) => d.rubroId === rubroId);
    await db.insert(accionCorrectiva).values({
      obraId,
      rubroId,
      periodo: control?.periodoCorte ?? hoyISO(),
      desvioPesos: desvio?.sv ?? 0,
      desvioDias: desvio?.desvioDias ?? 0,
      creadoEn: hoyISO(),
      ...campos,
    });
  }

  revalidatePath(RUTA);
}
