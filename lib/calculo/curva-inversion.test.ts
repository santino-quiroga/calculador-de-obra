import { describe, expect, it } from "vitest";
import {
  calcularCurvaTeorica,
  listarPeriodosEntre,
  montoNetoRubro,
  repartirMontoCampana,
  repartirMontoLineal,
  repartirMontoManual,
  validarDistribucionManual,
  type TareaParaCurva,
} from "./curva-inversion";

describe("listarPeriodosEntre", () => {
  it("devuelve un único período mensual cuando la tarea no cruza de mes", () => {
    expect(listarPeriodosEntre("2026-01-05", "2026-01-20", "mensual")).toEqual(["2026-01"]);
  });

  it("devuelve los meses ordenados cuando la tarea cruza el límite", () => {
    expect(listarPeriodosEntre("2026-01-22", "2026-03-05", "mensual")).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
    ]);
  });
});

describe("repartirMontoLineal", () => {
  it("pone el 100% en un único período cuando la tarea no cruza de mes", () => {
    const reparto = repartirMontoLineal("2026-01-01", "2026-01-31", 1000, "mensual");
    expect(reparto).toHaveLength(1);
    expect(reparto[0].periodo).toBe("2026-01");
    expect(reparto[0].monto).toBeCloseTo(1000, 6);
  });

  it("reparte proporcional a los días de cada mes cuando la tarea cruza el límite", () => {
    // 10 días de enero (22 al 31) + 10 días de febrero (1 al 10) = 20 días totales
    const reparto = repartirMontoLineal("2026-01-22", "2026-02-10", 2000, "mensual");
    const enero = reparto.find((r) => r.periodo === "2026-01")!;
    const febrero = reparto.find((r) => r.periodo === "2026-02")!;
    expect(enero.monto).toBeCloseTo(1000, 6);
    expect(febrero.monto).toBeCloseTo(1000, 6);
  });

  it("el total repartido siempre suma el monto original", () => {
    const reparto = repartirMontoLineal("2026-03-15", "2026-06-10", 12345.67, "mensual");
    const total = reparto.reduce((suma, r) => suma + r.monto, 0);
    expect(total).toBeCloseTo(12345.67, 6);
  });
});

describe("repartirMontoCampana", () => {
  it("el total repartido suma el monto original", () => {
    const reparto = repartirMontoCampana("2026-01-01", "2026-03-31", 9000, "mensual");
    const total = reparto.reduce((suma, r) => suma + r.monto, 0);
    expect(total).toBeCloseTo(9000, 6);
  });

  it("el período del medio recibe más monto que los extremos (forma de campana)", () => {
    const reparto = repartirMontoCampana("2026-01-01", "2026-03-31", 9000, "mensual");
    const porPeriodo = new Map(reparto.map((r) => [r.periodo, r.monto]));
    const enero = porPeriodo.get("2026-01")!;
    const febrero = porPeriodo.get("2026-02")!;
    const marzo = porPeriodo.get("2026-03")!;
    expect(febrero).toBeGreaterThan(enero);
    expect(febrero).toBeGreaterThan(marzo);
  });
});

describe("repartirMontoManual", () => {
  it("reparte el monto según el porcentaje cargado por período", () => {
    const reparto = repartirMontoManual({ "2026-01": 30, "2026-02": 70 }, 1000);
    expect(reparto).toEqual([
      { periodo: "2026-01", monto: 300 },
      { periodo: "2026-02", monto: 700 },
    ]);
  });
});

describe("validarDistribucionManual", () => {
  it("acepta una distribución que suma 100%", () => {
    expect(validarDistribucionManual({ "2026-01": 40, "2026-02": 60 })).toBe(true);
  });

  it("rechaza una distribución que no suma 100%", () => {
    expect(validarDistribucionManual({ "2026-01": 40, "2026-02": 50 })).toBe(false);
  });
});

describe("calcularCurvaTeorica", () => {
  it("acumula mes a mes y llega a 100% en el último período", () => {
    const tareas: TareaParaCurva[] = [
      { id: 1, fechaInicio: "2026-01-01", fechaFin: "2026-01-31", monto: 1000, curva: "lineal" },
      { id: 2, fechaInicio: "2026-02-01", fechaFin: "2026-02-28", monto: 1000, curva: "lineal" },
    ];
    const curva = calcularCurvaTeorica(tareas, "mensual");

    expect(curva).toHaveLength(2);
    expect(curva[0].periodo).toBe("2026-01");
    expect(curva[0].montoPeriodo).toBeCloseTo(1000, 6);
    expect(curva[0].acumulado).toBeCloseTo(1000, 6);
    expect(curva[1].acumulado).toBeCloseTo(2000, 6);
    expect(curva[1].acumuladoPct).toBeCloseTo(100, 6);
  });

  it("suma los montos de tareas superpuestas en el mismo período", () => {
    const tareas: TareaParaCurva[] = [
      { id: 1, fechaInicio: "2026-01-01", fechaFin: "2026-01-31", monto: 600, curva: "lineal" },
      { id: 2, fechaInicio: "2026-01-01", fechaFin: "2026-01-31", monto: 400, curva: "lineal" },
    ];
    const curva = calcularCurvaTeorica(tareas, "mensual");
    expect(curva).toHaveLength(1);
    expect(curva[0].periodo).toBe("2026-01");
    expect(curva[0].montoPeriodo).toBeCloseTo(1000, 6);
    expect(curva[0].acumulado).toBeCloseTo(1000, 6);
    expect(curva[0].acumuladoPct).toBeCloseTo(100, 6);
  });
});

describe("montoNetoRubro", () => {
  it("resta los montos ya desagregados a nivel ítem del subtotal del rubro", () => {
    expect(montoNetoRubro(10000, [3000, 2000])).toBe(5000);
  });

  it("devuelve el subtotal completo si no hay ítems desagregados", () => {
    expect(montoNetoRubro(10000, [])).toBe(10000);
  });
});
