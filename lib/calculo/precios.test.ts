import { describe, expect, it } from "vitest";
import { obtenerPrecioVigente } from "./precios";

const historialCemento = [
  { fechaVigencia: "2026-01-01", precio: 8000 },
  { fechaVigencia: "2026-03-01", precio: 8500 },
  { fechaVigencia: "2026-06-01", precio: 9200 },
];

describe("obtenerPrecioVigente", () => {
  it("devuelve el registro cuya fecha coincide exactamente", () => {
    const resultado = obtenerPrecioVigente(historialCemento, "2026-03-01");
    expect(resultado?.precio).toBe(8500);
  });

  it("devuelve el registro más reciente anterior a la fecha consultada", () => {
    const resultado = obtenerPrecioVigente(historialCemento, "2026-05-15");
    expect(resultado?.precio).toBe(8500);
  });

  it("devuelve undefined si no hay ningún precio anterior a la fecha", () => {
    const resultado = obtenerPrecioVigente(historialCemento, "2025-12-01");
    expect(resultado).toBeUndefined();
  });

  it("devuelve el último precio cargado cuando la fecha es muy posterior", () => {
    const resultado = obtenerPrecioVigente(historialCemento, "2027-01-01");
    expect(resultado?.precio).toBe(9200);
  });

  it("no depende del orden en que vengan los registros del historial", () => {
    const desordenado = [...historialCemento].reverse();
    const resultado = obtenerPrecioVigente(desordenado, "2026-04-01");
    expect(resultado?.precio).toBe(8500);
  });

  it("funciona con historiales vacíos", () => {
    const resultado = obtenerPrecioVigente([], "2026-01-01");
    expect(resultado).toBeUndefined();
  });

  it("ante dos precios con la misma fecha, gana el que aparece después (el cargado más tarde)", () => {
    const conEmpate = [
      { fechaVigencia: "2026-08-31", precio: 950 },
      { fechaVigencia: "2026-08-31", precio: 1092.5 },
    ];
    const resultado = obtenerPrecioVigente(conEmpate, "2026-08-31");
    expect(resultado?.precio).toBe(1092.5);
  });
});
