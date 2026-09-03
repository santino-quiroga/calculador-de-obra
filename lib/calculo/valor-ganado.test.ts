import { describe, expect, it } from "vitest";
import { calcularCurvaReal, calcularDesviosPorRubro, calcularSemaforo } from "./valor-ganado";
import type { PuntoCurva } from "./curva-inversion";

describe("calcularSemaforo", () => {
  it("verde cuando SPI >= 0.95", () => {
    expect(calcularSemaforo(1)).toBe("verde");
    expect(calcularSemaforo(0.95)).toBe("verde");
  });

  it("amarillo entre 0.85 y 0.95", () => {
    expect(calcularSemaforo(0.9)).toBe("amarillo");
    expect(calcularSemaforo(0.85)).toBe("amarillo");
  });

  it("rojo por debajo de 0.85", () => {
    expect(calcularSemaforo(0.84)).toBe("rojo");
    expect(calcularSemaforo(0.5)).toBe("rojo");
  });
});

describe("calcularCurvaReal", () => {
  it("acumula por período y calcula el % sobre el total contractual", () => {
    const curva = calcularCurvaReal(
      [
        { periodo: "2026-01", monto: 1000 },
        { periodo: "2026-02", monto: 500 },
      ],
      4000
    );
    expect(curva).toEqual([
      { periodo: "2026-01", montoPeriodo: 1000, acumulado: 1000, acumuladoPct: 25 },
      { periodo: "2026-02", montoPeriodo: 500, acumulado: 1500, acumuladoPct: 37.5 },
    ]);
  });

  it("suma varios avances del mismo período", () => {
    const curva = calcularCurvaReal(
      [
        { periodo: "2026-01", monto: 300 },
        { periodo: "2026-01", monto: 200 },
      ],
      1000
    );
    expect(curva).toHaveLength(1);
    expect(curva[0].acumulado).toBe(500);
  });

  it("queda recortada sola al último período con datos: sin avances, curva vacía", () => {
    expect(calcularCurvaReal([], 1000)).toEqual([]);
  });
});

describe("calcularDesviosPorRubro", () => {
  const curvaTeorica: PuntoCurva[] = [
    { periodo: "2026-01", montoPeriodo: 1000, acumulado: 1000, acumuladoPct: 25 },
    { periodo: "2026-02", montoPeriodo: 1000, acumulado: 2000, acumuladoPct: 50 },
    { periodo: "2026-03", montoPeriodo: 1000, acumulado: 3000, acumuladoPct: 75 },
    { periodo: "2026-04", montoPeriodo: 1000, acumulado: 4000, acumuladoPct: 100 },
  ];

  it("SPI = 1 y sin desvío en días cuando el avance real coincide con el teórico", () => {
    const curvaReal: PuntoCurva[] = [{ periodo: "2026-02", montoPeriodo: 2000, acumulado: 2000, acumuladoPct: 50 }];
    const [desvio] = calcularDesviosPorRubro({
      periodoCorte: "2026-02",
      granularidad: "mensual",
      rubros: [{ rubroId: 1, nombre: "Mampostería", curvaTeorica, curvaReal }],
    });
    expect(desvio.pv).toBe(2000);
    expect(desvio.ev).toBe(2000);
    expect(desvio.spi).toBeCloseTo(1, 6);
    expect(desvio.sv).toBe(0);
    expect(desvio.semaforo).toBe("verde");
    expect(desvio.desvioDias).toBeCloseTo(0, 0);
  });

  it("rubro atrasado: SPI < 0.85, SV negativo, semáforo rojo y desvío en días positivo", () => {
    const curvaReal: PuntoCurva[] = [{ periodo: "2026-02", montoPeriodo: 1000, acumulado: 1000, acumuladoPct: 25 }];
    const [desvio] = calcularDesviosPorRubro({
      periodoCorte: "2026-02",
      granularidad: "mensual",
      rubros: [{ rubroId: 1, nombre: "Mampostería", curvaTeorica, curvaReal }],
    });
    expect(desvio.pv).toBe(2000);
    expect(desvio.ev).toBe(1000);
    expect(desvio.spi).toBeCloseTo(0.5, 6);
    expect(desvio.sv).toBe(-1000);
    expect(desvio.semaforo).toBe("rojo");
    // el monto de 1000 se alcanzaba a fin de enero, y el corte es fin de febrero: ~28 días de atraso
    expect(desvio.desvioDias).toBeGreaterThan(20);
  });

  it("rubro adelantado: SPI > 1 y semáforo verde", () => {
    const curvaReal: PuntoCurva[] = [{ periodo: "2026-01", montoPeriodo: 1500, acumulado: 1500, acumuladoPct: 37.5 }];
    const [desvio] = calcularDesviosPorRubro({
      periodoCorte: "2026-01",
      granularidad: "mensual",
      rubros: [{ rubroId: 1, nombre: "Mampostería", curvaTeorica, curvaReal }],
    });
    expect(desvio.spi).toBeGreaterThan(1);
    expect(desvio.sv).toBeGreaterThan(0);
    expect(desvio.semaforo).toBe("verde");
    expect(desvio.desvioDias).toBeLessThan(0);
  });

  it("sin PV (todavía no arrancó el plan teórico): SPI null y semáforo verde", () => {
    const [desvio] = calcularDesviosPorRubro({
      periodoCorte: "2025-12",
      granularidad: "mensual",
      rubros: [{ rubroId: 1, nombre: "Mampostería", curvaTeorica, curvaReal: [] }],
    });
    expect(desvio.pv).toBe(0);
    expect(desvio.spi).toBeNull();
    expect(desvio.semaforo).toBe("verde");
  });
});
