import { describe, expect, it } from "vitest";
import { calcularCoeficienteResumen } from "./coeficiente-resumen";
import {
  calcularComposicionCosto,
  desagregarCoeficiente,
  resolverBeneficioParaPrecioObjetivo,
} from "./resumen-empresa";

const PARAMETROS = {
  gastosGeneralesPct: 15,
  beneficioPct: 12,
  gastosFinancierosPct: 2,
  segurosPct: 1.5,
  ivaPct: 21,
  ingresosBrutosPct: 3.5,
  selladoPct: 1,
};

describe("calcularComposicionCosto", () => {
  it("separa la mano de obra en neta y aporte de cargas sociales dividiendo por el factor", () => {
    const resultado = calcularComposicionCosto(
      [{ materiales: 500, manoObraConCargas: 2000, equipos: 500 }],
      2
    );

    expect(resultado.manoObraNeta).toBeCloseTo(1000, 6);
    expect(resultado.aporteCargasSociales).toBeCloseTo(1000, 6);
    expect(resultado.costoDirecto).toBeCloseTo(3000, 6);
    expect(resultado.materialesPct).toBeCloseTo(16.6667, 3);
    expect(resultado.manoObraPct).toBeCloseTo(66.6667, 3);
    expect(resultado.equiposPct).toBeCloseTo(16.6667, 3);
  });

  it("suma varios ítems del presupuesto", () => {
    const resultado = calcularComposicionCosto(
      [
        { materiales: 100, manoObraConCargas: 100, equipos: 0 },
        { materiales: 200, manoObraConCargas: 100, equipos: 50 },
      ],
      1
    );
    expect(resultado.materiales).toBe(300);
    expect(resultado.manoObraConCargas).toBe(200);
    expect(resultado.equipos).toBe(50);
    expect(resultado.costoDirecto).toBe(550);
  });

  it("no divide por cero si el costo directo es 0", () => {
    const resultado = calcularComposicionCosto([], 1.94);
    expect(resultado.materialesPct).toBe(0);
    expect(resultado.costoDirecto).toBe(0);
  });
});

describe("desagregarCoeficiente", () => {
  it("las líneas suman lo mismo que ya calcula calcularCoeficienteResumen", () => {
    const resultado = calcularCoeficienteResumen(1000, PARAMETROS);
    const lineas = desagregarCoeficiente(resultado, PARAMETROS);

    const porConcepto = Object.fromEntries(lineas.map((l) => [l.concepto, l.monto]));

    expect(porConcepto["Gastos generales"]).toBeCloseTo(150, 6);
    expect(porConcepto["Beneficio"]).toBeCloseTo(138, 6);
    expect(porConcepto["Seguros"] + porConcepto["Gastos financieros"]).toBeCloseTo(
      resultado.subtotal3 - resultado.subtotal2,
      6
    );
    expect(porConcepto["IVA"] + porConcepto["Ingresos brutos (IIBB)"] + porConcepto["Sellado"]).toBeCloseTo(
      resultado.impuestos,
      6
    );
  });
});

describe("resolverBeneficioParaPrecioObjetivo", () => {
  it("reproduce el mismo precio final si se lo vuelve a pasar por calcularCoeficienteResumen", () => {
    const costoDirecto = 1000;
    const precioObjetivo = 1673.0154; // precio final con beneficio 12%, ver PARAMETROS

    const beneficioNecesario = resolverBeneficioParaPrecioObjetivo(costoDirecto, precioObjetivo, PARAMETROS);
    expect(beneficioNecesario).not.toBeNull();
    expect(beneficioNecesario!).toBeCloseTo(12, 3);

    const resultado = calcularCoeficienteResumen(costoDirecto, {
      ...PARAMETROS,
      beneficioPct: beneficioNecesario!,
    });
    expect(resultado.precioFinal).toBeCloseTo(precioObjetivo, 2);
  });

  it("devuelve null si el costo directo es 0", () => {
    expect(resolverBeneficioParaPrecioObjetivo(0, 1000, PARAMETROS)).toBeNull();
  });
});
