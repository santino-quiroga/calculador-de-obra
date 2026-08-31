import { describe, expect, it } from "vitest";
import { calcularCoeficienteResumen } from "./coeficiente-resumen";

describe("calcularCoeficienteResumen", () => {
  it("aplica la cascada paso a paso y suma los impuestos directo (CLAUDE.md 6.2)", () => {
    const resultado = calcularCoeficienteResumen(1000, {
      gastosGeneralesPct: 15,
      beneficioPct: 12,
      gastosFinancierosPct: 2,
      segurosPct: 1.5,
      ivaPct: 21,
      ingresosBrutosPct: 3.5,
      selladoPct: 1,
    });

    expect(resultado.subtotal1).toBeCloseTo(1150, 6); // 1000 * 1.15
    expect(resultado.subtotal2).toBeCloseTo(1288, 6); // 1150 * 1.12
    expect(resultado.subtotal3).toBeCloseTo(1333.08, 6); // 1288 * 1.035
    expect(resultado.impuestos).toBeCloseTo(339.9354, 4); // 1333.08 * 0.255
    expect(resultado.precioFinal).toBeCloseTo(1673.0154, 4);
    expect(resultado.coeficienteK).toBeCloseTo(1.6730154, 6);
  });

  it("da coeficiente 0 cuando el costo directo es 0, sin dividir por cero", () => {
    const resultado = calcularCoeficienteResumen(0, {
      gastosGeneralesPct: 15,
      beneficioPct: 12,
      gastosFinancierosPct: 2,
      segurosPct: 1.5,
      ivaPct: 21,
      ingresosBrutosPct: 3.5,
      selladoPct: 1,
    });

    expect(resultado.coeficienteK).toBe(0);
    expect(resultado.precioFinal).toBe(0);
  });

  it("no suma los impuestos sobre el costo directo sino sobre el subtotal 3 (no se despejan dividiendo)", () => {
    const resultado = calcularCoeficienteResumen(1000, {
      gastosGeneralesPct: 0,
      beneficioPct: 0,
      gastosFinancierosPct: 0,
      segurosPct: 0,
      ivaPct: 10,
      ingresosBrutosPct: 0,
      selladoPct: 0,
    });

    // Sin gastos generales, beneficio ni financieros: subtotal3 = costoDirecto = 1000
    // Impuestos sumados directo: 1000 * 0.10 = 100 → precioFinal = 1100 (no 1000 / 0.9)
    expect(resultado.subtotal3).toBeCloseTo(1000, 6);
    expect(resultado.precioFinal).toBeCloseTo(1100, 6);
  });
});
