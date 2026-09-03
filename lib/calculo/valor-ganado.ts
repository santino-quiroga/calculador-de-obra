// Valor ganado y desvíos (CLAUDE.md 6.5). Funciones puras: reciben la curva
// teórica y los avances reales ya resueltos a monto, no tocan la base.
//
// Decisiones de esta fase (no cerradas en CLAUDE.md):
// - "Período de corte" = el último mes con algún avance cargado en la obra.
//   Ahí se miden PV, EV, SPI y SV.
// - Desvío en días: se busca en la curva teórica en qué fecha se iba a
//   alcanzar el mismo monto acumulado que el EV real (interpolando dentro
//   del mes), y se compara con la fecha de corte real. Positivo = atraso.

import type { Granularidad, PuntoCurva } from "./curva-inversion";

export type Semaforo = "verde" | "amarillo" | "rojo";

export function calcularSemaforo(spi: number): Semaforo {
  if (spi >= 0.95) return "verde";
  if (spi >= 0.85) return "amarillo";
  return "rojo";
}

export interface AvancePeriodo {
  periodo: string; // 'YYYY-MM'
  monto: number; // monto real ejecutado ese período, ya resuelto (cantidad × precio, o % × contractual)
}

// Curva real acumulada. A diferencia de la teórica, no hay que repartir nada
// en el tiempo: cada avance ya es "lo que se hizo ese mes". Solo agrupa y
// acumula — y, como solo recorre los períodos que tienen un avance cargado,
// queda recortada sola al último mes con datos (CLAUDE.md 6.4).
export function calcularCurvaReal(avances: AvancePeriodo[], totalContractual: number): PuntoCurva[] {
  const montoPorPeriodo = new Map<string, number>();
  for (const avance of avances) {
    montoPorPeriodo.set(avance.periodo, (montoPorPeriodo.get(avance.periodo) ?? 0) + avance.monto);
  }

  const periodosOrdenados = [...montoPorPeriodo.keys()].sort();
  let acumulado = 0;
  return periodosOrdenados.map((periodo) => {
    const montoPeriodo = montoPorPeriodo.get(periodo) ?? 0;
    acumulado += montoPeriodo;
    return {
      periodo,
      montoPeriodo,
      acumulado,
      acumuladoPct: totalContractual === 0 ? 0 : (acumulado / totalContractual) * 100,
    };
  });
}

function fechaISOaDate(fechaISO: string): Date {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

function diasEntre(desde: string, hasta: string): number {
  return Math.round((fechaISOaDate(hasta).getTime() - fechaISOaDate(desde).getTime()) / 86400000);
}

// Última fecha calendario de un período ('YYYY-MM' o 'YYYY-Www', semana ISO).
function finDePeriodo(periodo: string, granularidad: Granularidad): string {
  if (granularidad === "mensual") {
    const [anio, mes] = periodo.split("-").map(Number);
    const finMes = new Date(Date.UTC(anio, mes, 0)); // día 0 del mes siguiente = último día de este mes
    return finMes.toISOString().slice(0, 10);
  }

  const [anioStr, semanaStr] = periodo.split("-W");
  const anio = Number(anioStr);
  const semana = Number(semanaStr);
  // Jueves de la semana 1 ISO cae siempre entre el 1 y el 7 de enero.
  const cuatroDeEnero = new Date(Date.UTC(anio, 0, 4));
  const diaSemanaIso = cuatroDeEnero.getUTCDay() || 7;
  const juevesSemana1 = new Date(cuatroDeEnero);
  juevesSemana1.setUTCDate(cuatroDeEnero.getUTCDate() - (diaSemanaIso - 1) + 3);
  const juevesSemanaN = new Date(juevesSemana1);
  juevesSemanaN.setUTCDate(juevesSemana1.getUTCDate() + (semana - 1) * 7);
  const domingoSemanaN = new Date(juevesSemanaN);
  domingoSemanaN.setUTCDate(juevesSemanaN.getUTCDate() + 3); // jueves + 3 = domingo, fin de esa semana
  return domingoSemanaN.toISOString().slice(0, 10);
}

// Fecha en la que la curva teórica alcanza (interpolando) el monto `monto`.
// Si el monto es menor o igual a cero, es "todavía no se esperaba nada" →
// devuelve el inicio de la curva. Si supera el total teórico, devuelve el
// final de la curva (no hay con qué comparar más allá).
function fechaTeoricaParaMonto(curvaTeorica: PuntoCurva[], monto: number, granularidad: Granularidad): string | null {
  if (curvaTeorica.length === 0) return null;
  if (monto <= 0) return finDePeriodo(curvaTeorica[0].periodo, granularidad);

  const ultimo = curvaTeorica[curvaTeorica.length - 1];
  if (monto >= ultimo.acumulado) return finDePeriodo(ultimo.periodo, granularidad);

  let anterior: { fecha: string; acumulado: number } = {
    fecha: sumarDiasISO(finDePeriodo(curvaTeorica[0].periodo, granularidad), -diasDelPeriodo(curvaTeorica[0].periodo, granularidad)),
    acumulado: 0,
  };

  for (const punto of curvaTeorica) {
    if (punto.acumulado >= monto) {
      const finTramo = finDePeriodo(punto.periodo, granularidad);
      const montoDelTramo = punto.acumulado - anterior.acumulado;
      const fraccion = montoDelTramo === 0 ? 0 : (monto - anterior.acumulado) / montoDelTramo;
      const diasTramo = diasEntre(anterior.fecha, finTramo);
      return sumarDiasISO(anterior.fecha, Math.round(diasTramo * fraccion));
    }
    anterior = { fecha: finDePeriodo(punto.periodo, granularidad), acumulado: punto.acumulado };
  }

  return finDePeriodo(ultimo.periodo, granularidad);
}

function diasDelPeriodo(periodo: string, granularidad: Granularidad): number {
  return granularidad === "mensual" ? 30 : 7;
}

function sumarDiasISO(fechaISO: string, dias: number): string {
  const fecha = fechaISOaDate(fechaISO);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

export interface DesvioRubro {
  rubroId: number;
  nombre: string;
  pv: number;
  ev: number;
  spi: number | null; // null cuando pv = 0 (no se puede dividir)
  sv: number;
  semaforo: Semaforo;
  desvioDias: number | null;
}

export function calcularDesviosPorRubro(params: {
  periodoCorte: string;
  granularidad: Granularidad;
  rubros: { rubroId: number; nombre: string; curvaTeorica: PuntoCurva[]; curvaReal: PuntoCurva[] }[];
}): DesvioRubro[] {
  const fechaCorte = finDePeriodo(params.periodoCorte, params.granularidad);

  return params.rubros.map(({ rubroId, nombre, curvaTeorica, curvaReal }) => {
    const puntoTeoricoAlCorte = [...curvaTeorica].reverse().find((p) => p.periodo <= params.periodoCorte);
    const pv = puntoTeoricoAlCorte?.acumulado ?? 0;

    const puntoRealAlCorte = [...curvaReal].reverse().find((p) => p.periodo <= params.periodoCorte);
    const ev = puntoRealAlCorte?.acumulado ?? 0;

    const spi = pv === 0 ? null : ev / pv;
    const sv = ev - pv;
    const semaforo = spi === null ? "verde" : calcularSemaforo(spi);

    const fechaTeorica = fechaTeoricaParaMonto(curvaTeorica, ev, params.granularidad);
    const desvioDias = fechaTeorica === null ? null : diasEntre(fechaTeorica, fechaCorte);

    return { rubroId, nombre, pv, ev, spi, sv, semaforo, desvioDias };
  });
}
