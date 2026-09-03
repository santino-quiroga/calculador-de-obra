import { describe, expect, it } from "vitest";
import { calcularCertificado, siguienteNumeroCertificado } from "./certificados";

describe("calcularCertificado", () => {
  it("descuenta anticipo y fondo de reparo del bruto y acumula", () => {
    const resultado = calcularCertificado({
      montoBruto: 100000,
      anticipoPct: 10,
      fondoReparoPct: 5,
      acumuladoBrutoAnterior: 50000,
    });

    expect(resultado.descAnticipo).toBe(10000);
    expect(resultado.descFondoReparo).toBe(5000);
    expect(resultado.montoNeto).toBe(85000);
    expect(resultado.acumuladoBrutoAnterior).toBe(50000);
    expect(resultado.acumuladoBrutoActual).toBe(150000);
  });

  it("sin anticipo ni fondo de reparo, el neto es igual al bruto", () => {
    const resultado = calcularCertificado({
      montoBruto: 50000,
      anticipoPct: 0,
      fondoReparoPct: 0,
      acumuladoBrutoAnterior: 0,
    });
    expect(resultado.montoNeto).toBe(50000);
  });
});

describe("siguienteNumeroCertificado", () => {
  it("empieza en 1 cuando no hay certificados previos", () => {
    expect(siguienteNumeroCertificado([])).toBe(1);
  });

  it("sigue después del mayor número usado, aunque se haya borrado alguno intermedio", () => {
    expect(siguienteNumeroCertificado([{ numero: 1 }, { numero: 3 }])).toBe(4);
  });
});
