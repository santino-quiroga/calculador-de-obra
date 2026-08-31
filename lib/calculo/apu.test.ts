import { describe, expect, it } from "vitest";
import { calcularCostoApu, type ComponenteApuInput } from "./apu";

describe("calcularCostoApu", () => {
  it("aplica el desperdicio de materiales sobre la cantidad unitaria", () => {
    const componentes: ComponenteApuInput[] = [
      { id: 1, insumoId: 100, tipo: "material", cantidadUnitaria: 10, desperdicioPct: 5, rendimientoHoras: null },
    ];
    const precios = new Map([[100, [{ fechaVigencia: "2026-01-01", precio: 100 }]]]);

    const resultado = calcularCostoApu(componentes, precios, "2026-06-01", 1);

    // 10 * (1 + 5/100) * 100 = 1050
    expect(resultado.lineas[0].costo).toBeCloseTo(1050, 6);
    expect(resultado.subtotalMateriales).toBeCloseTo(1050, 6);
    expect(resultado.costoDirecto).toBeCloseTo(1050, 6);
  });

  it("aplica el factor de cargas sociales sobre la mano de obra, no sobre materiales ni equipos", () => {
    const componentes: ComponenteApuInput[] = [
      { id: 1, insumoId: 200, tipo: "mano_obra", cantidadUnitaria: null, desperdicioPct: null, rendimientoHoras: 2 },
      { id: 2, insumoId: 300, tipo: "equipo", cantidadUnitaria: null, desperdicioPct: null, rendimientoHoras: 3 },
    ];
    const precios = new Map([
      [200, [{ fechaVigencia: "2026-01-01", precio: 500 }]],
      [300, [{ fechaVigencia: "2026-01-01", precio: 200 }]],
    ]);

    const resultado = calcularCostoApu(componentes, precios, "2026-06-01", 1.94);

    // mano de obra: 2 * 500 * 1.94 = 1940
    expect(resultado.subtotalManoObra).toBeCloseTo(1940, 6);
    // equipo: 3 * 200 = 600 (sin cargas sociales)
    expect(resultado.subtotalEquipos).toBeCloseTo(600, 6);
    expect(resultado.costoDirecto).toBeCloseTo(2540, 6);
  });

  it("marca con error la línea de un insumo sin precio vigente a la fecha, sin calcular un costo incorrecto", () => {
    const componentes: ComponenteApuInput[] = [
      { id: 1, insumoId: 400, tipo: "material", cantidadUnitaria: 5, desperdicioPct: 0, rendimientoHoras: null },
    ];
    const precios = new Map([[400, [{ fechaVigencia: "2026-06-01", precio: 100 }]]]);

    // Fecha de cálculo anterior a la única fecha de vigencia cargada
    const resultado = calcularCostoApu(componentes, precios, "2026-01-01", 1);

    expect(resultado.lineas[0].costo).toBeNull();
    expect(resultado.lineas[0].error).toBeDefined();
    expect(resultado.tieneErrores).toBe(true);
    expect(resultado.costoDirecto).toBe(0);
  });

  it("suma correctamente materiales, mano de obra y equipos en el costo directo", () => {
    const componentes: ComponenteApuInput[] = [
      { id: 1, insumoId: 1, tipo: "material", cantidadUnitaria: 1, desperdicioPct: 0, rendimientoHoras: null },
      { id: 2, insumoId: 2, tipo: "mano_obra", cantidadUnitaria: null, desperdicioPct: null, rendimientoHoras: 1 },
      { id: 3, insumoId: 3, tipo: "equipo", cantidadUnitaria: null, desperdicioPct: null, rendimientoHoras: 1 },
    ];
    const precios = new Map([
      [1, [{ fechaVigencia: "2026-01-01", precio: 100 }]],
      [2, [{ fechaVigencia: "2026-01-01", precio: 200 }]],
      [3, [{ fechaVigencia: "2026-01-01", precio: 300 }]],
    ]);

    const resultado = calcularCostoApu(componentes, precios, "2026-06-01", 1);

    expect(resultado.costoDirecto).toBeCloseTo(600, 6);
  });
});
