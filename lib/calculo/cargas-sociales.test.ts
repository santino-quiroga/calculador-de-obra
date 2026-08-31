import { describe, expect, it } from "vitest";
import { calcularFactorCargasSociales } from "./cargas-sociales";

describe("calcularFactorCargasSociales", () => {
  it("devuelve factor 1 sin conceptos", () => {
    const resultado = calcularFactorCargasSociales([]);
    expect(resultado.factor).toBe(1);
    expect(resultado.pasos).toHaveLength(0);
  });

  it("no compone dos conceptos que comparten la base 'salario_basico'", () => {
    const resultado = calcularFactorCargasSociales([
      { nombre: "A", alicuotaPct: 10, baseAplicacion: "salario_basico", orden: 1 },
      { nombre: "B", alicuotaPct: 10, baseAplicacion: "salario_basico", orden: 2 },
    ]);
    // 1 + 0.10 + 0.10 = 1.20 (no 1 * 1.10 * 1.10 = 1.21)
    expect(resultado.factor).toBeCloseTo(1.2, 6);
  });

  it("aplica en cascada sobre lo acumulado los conceptos con otra base", () => {
    const resultado = calcularFactorCargasSociales([
      { nombre: "A", alicuotaPct: 10, baseAplicacion: "salario_basico", orden: 1 },
      { nombre: "B", alicuotaPct: 10, baseAplicacion: "subtotal_remunerativo", orden: 2 },
    ]);
    // 1 -> 1.10 -> 1.10 * 1.10 = 1.21
    expect(resultado.factor).toBeCloseTo(1.21, 6);
  });

  it("reproduce el ejemplo de los 5 conceptos de seed (CLAUDE.md 6.1)", () => {
    const resultado = calcularFactorCargasSociales([
      { nombre: "SAC", alicuotaPct: 8.33, baseAplicacion: "salario_basico", orden: 1 },
      { nombre: "Vacaciones", alicuotaPct: 7.69, baseAplicacion: "salario_basico", orden: 2 },
      { nombre: "Aportes", alicuotaPct: 45, baseAplicacion: "subtotal_remunerativo", orden: 3 },
      { nombre: "FCL", alicuotaPct: 12, baseAplicacion: "base_aportes", orden: 4 },
      { nombre: "Seguro de vida", alicuotaPct: 3, baseAplicacion: "subtotal_liquidado", orden: 5 },
    ]);
    expect(resultado.factor).toBeCloseTo(1.9407, 3);
    expect(resultado.pasos).toHaveLength(5);
  });

  it("no depende del orden en que vengan los conceptos en el array de entrada", () => {
    const conceptos = [
      { nombre: "Seguro de vida", alicuotaPct: 3, baseAplicacion: "subtotal_liquidado" as const, orden: 5 },
      { nombre: "SAC", alicuotaPct: 8.33, baseAplicacion: "salario_basico" as const, orden: 1 },
      { nombre: "FCL", alicuotaPct: 12, baseAplicacion: "base_aportes" as const, orden: 4 },
      { nombre: "Aportes", alicuotaPct: 45, baseAplicacion: "subtotal_remunerativo" as const, orden: 3 },
      { nombre: "Vacaciones", alicuotaPct: 7.69, baseAplicacion: "salario_basico" as const, orden: 2 },
    ];
    const resultado = calcularFactorCargasSociales(conceptos);
    expect(resultado.factor).toBeCloseTo(1.9407, 3);
  });
});
