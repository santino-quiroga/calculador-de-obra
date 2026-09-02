// Reparto del monto de una tarea del plan de trabajos en el tiempo, y curva
// de inversión teórica acumulada (CLAUDE.md 6.4). Funciones puras: reciben
// fechas y montos ya resueltos, no tocan la base ni conocen el presupuesto.
//
// Las fórmulas de reparto no están cerradas en CLAUDE.md — se definieron acá
// (Fase 6):
// - lineal: proporcional a la cantidad de días de la tarea que caen en cada
//   período.
// - campana: peso por día = sin(pi * t), con t la posición relativa del día
//   dentro de la tarea (0 a 1) — pico en el medio, cae suave en los bordes,
//   sin depender de ninguna distribución estadística real.
// - manual: el usuario carga el % de cada período a mano.

export type Granularidad = "mensual" | "semanal";
export type TipoCurva = "lineal" | "campana" | "manual";

export interface RepartoPeriodo {
  periodo: string; // 'YYYY-MM' (mensual) o 'YYYY-Www' (semanal, semana ISO)
  monto: number;
}

function fechaISOaDate(fechaISO: string): Date {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

function dateAPeriodoMensual(fecha: Date): string {
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
}

function dateAPeriodoSemanal(fecha: Date): string {
  // Semana ISO 8601: la semana que contiene el jueves de esa semana define el año.
  const d = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
  const diaSemanaIso = d.getUTCDay() || 7; // lunes=1 ... domingo=7
  d.setUTCDate(d.getUTCDate() + 4 - diaSemanaIso);
  const inicioAnio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const semana = Math.ceil(((d.getTime() - inicioAnio.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(semana).padStart(2, "0")}`;
}

function dateAPeriodo(fecha: Date, granularidad: Granularidad): string {
  return granularidad === "mensual" ? dateAPeriodoMensual(fecha) : dateAPeriodoSemanal(fecha);
}

function listarDias(fechaInicio: string, fechaFin: string): Date[] {
  const inicio = fechaISOaDate(fechaInicio);
  const fin = fechaISOaDate(fechaFin);
  const dias: Date[] = [];
  for (let t = inicio.getTime(); t <= fin.getTime(); t += 86400000) {
    dias.push(new Date(t));
  }
  return dias;
}

function agruparPorPeriodo(
  dias: Date[],
  montosPorDia: number[],
  granularidad: Granularidad
): RepartoPeriodo[] {
  const acumuladoPorPeriodo = new Map<string, number>();
  dias.forEach((dia, indice) => {
    const periodo = dateAPeriodo(dia, granularidad);
    acumuladoPorPeriodo.set(periodo, (acumuladoPorPeriodo.get(periodo) ?? 0) + montosPorDia[indice]);
  });
  return [...acumuladoPorPeriodo.entries()].map(([periodo, monto]) => ({ periodo, monto }));
}

// Períodos que cubre una tarea entre fechaInicio y fechaFin, para armar los
// inputs de "% por período" del reparto manual.
export function listarPeriodosEntre(fechaInicio: string, fechaFin: string, granularidad: Granularidad): string[] {
  const periodos = new Set<string>();
  for (const dia of listarDias(fechaInicio, fechaFin)) {
    periodos.add(dateAPeriodo(dia, granularidad));
  }
  return [...periodos].sort();
}

export function repartirMontoLineal(
  fechaInicio: string,
  fechaFin: string,
  monto: number,
  granularidad: Granularidad
): RepartoPeriodo[] {
  const dias = listarDias(fechaInicio, fechaFin);
  if (dias.length === 0) return [];

  const montoPorDia = monto / dias.length;
  return agruparPorPeriodo(dias, dias.map(() => montoPorDia), granularidad);
}

export function repartirMontoCampana(
  fechaInicio: string,
  fechaFin: string,
  monto: number,
  granularidad: Granularidad
): RepartoPeriodo[] {
  const dias = listarDias(fechaInicio, fechaFin);
  if (dias.length === 0) return [];

  const pesos = dias.map((_, indice) => {
    const t = dias.length === 1 ? 0.5 : (indice + 0.5) / dias.length;
    return Math.sin(Math.PI * t);
  });
  const sumaPesos = pesos.reduce((suma, peso) => suma + peso, 0);

  const montosPorDia =
    sumaPesos === 0
      ? dias.map(() => monto / dias.length)
      : pesos.map((peso) => (peso / sumaPesos) * monto);

  return agruparPorPeriodo(dias, montosPorDia, granularidad);
}

export function repartirMontoManual(distribucionPct: Record<string, number>, monto: number): RepartoPeriodo[] {
  return Object.entries(distribucionPct).map(([periodo, pct]) => ({
    periodo,
    monto: (monto * pct) / 100,
  }));
}

export function validarDistribucionManual(distribucionPct: Record<string, number>): boolean {
  const suma = Object.values(distribucionPct).reduce((total, pct) => total + pct, 0);
  return Math.abs(suma - 100) < 0.01;
}

export interface TareaParaCurva {
  id: number;
  fechaInicio: string;
  fechaFin: string;
  monto: number;
  curva: TipoCurva;
  distribucionManual?: Record<string, number> | null;
}

export function repartirMontoDeTarea(tarea: TareaParaCurva, granularidad: Granularidad): RepartoPeriodo[] {
  if (tarea.monto === 0) return [];

  if (tarea.curva === "manual") {
    return repartirMontoManual(tarea.distribucionManual ?? {}, tarea.monto);
  }
  if (tarea.curva === "campana") {
    return repartirMontoCampana(tarea.fechaInicio, tarea.fechaFin, tarea.monto, granularidad);
  }
  return repartirMontoLineal(tarea.fechaInicio, tarea.fechaFin, tarea.monto, granularidad);
}

export interface PuntoCurva {
  periodo: string;
  montoPeriodo: number;
  acumulado: number;
  acumuladoPct: number;
}

export function calcularCurvaTeorica(tareas: TareaParaCurva[], granularidad: Granularidad): PuntoCurva[] {
  const montoPorPeriodo = new Map<string, number>();
  for (const tarea of tareas) {
    for (const { periodo, monto } of repartirMontoDeTarea(tarea, granularidad)) {
      montoPorPeriodo.set(periodo, (montoPorPeriodo.get(periodo) ?? 0) + monto);
    }
  }

  const periodosOrdenados = [...montoPorPeriodo.keys()].sort();
  const totalGeneral = tareas.reduce((suma, tarea) => suma + tarea.monto, 0);

  let acumulado = 0;
  return periodosOrdenados.map((periodo) => {
    const montoPeriodo = montoPorPeriodo.get(periodo) ?? 0;
    acumulado += montoPeriodo;
    return {
      periodo,
      montoPeriodo,
      acumulado,
      acumuladoPct: totalGeneral === 0 ? 0 : (acumulado / totalGeneral) * 100,
    };
  });
}

// Cuánto del subtotal de un rubro sigue representado por la barra del rubro,
// una vez descontados los ítems que ya tienen su propia tarea (Fase 6:
// "puedo desplegar un rubro para planificar sus ítems por separado"). Así el
// total de la curva nunca duplica ni pierde monto sin importar cuánto se
// desagregue.
export function montoNetoRubro(subtotalRubro: number, montosItemsConTareaPropia: number[]): number {
  const montoDesagregado = montosItemsConTareaPropia.reduce((suma, monto) => suma + monto, 0);
  return subtotalRubro - montoDesagregado;
}
