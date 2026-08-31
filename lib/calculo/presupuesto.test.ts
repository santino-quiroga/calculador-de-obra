import { describe, expect, it } from "vitest";
import { asignarNumerosJerarquicos, calcularResumenPresupuesto } from "./presupuesto";

describe("asignarNumerosJerarquicos", () => {
  it("numera rubros y sus ítems en cascada, en el orden dado", () => {
    const resultado = asignarNumerosJerarquicos([
      { rubroId: 10, itemIds: [101, 102] },
      { rubroId: 20, itemIds: [201] },
    ]);

    expect(resultado[0].nroRubro).toBe("1");
    expect(resultado[0].items).toEqual([
      { id: 101, nroItem: "1.1" },
      { id: 102, nroItem: "1.2" },
    ]);
    expect(resultado[1].nroRubro).toBe("2");
    expect(resultado[1].items).toEqual([{ id: 201, nroItem: "2.1" }]);
  });

  it("funciona con rubros sin ítems", () => {
    const resultado = asignarNumerosJerarquicos([{ rubroId: 10, itemIds: [] }]);
    expect(resultado[0].items).toHaveLength(0);
  });
});

describe("calcularResumenPresupuesto", () => {
  it("calcula el precio total de cada ítem como cantidad × precio unitario", () => {
    const resultado = calcularResumenPresupuesto([
      { id: 1, rubroId: 1, cantidad: 10, precioUnitario: 100 },
    ]);
    expect(resultado.items[0].precioTotal).toBe(1000);
    expect(resultado.totalPresupuesto).toBe(1000);
  });

  it("agrupa los subtotales por rubro", () => {
    const resultado = calcularResumenPresupuesto([
      { id: 1, rubroId: 1, cantidad: 10, precioUnitario: 100 },
      { id: 2, rubroId: 1, cantidad: 5, precioUnitario: 200 },
      { id: 3, rubroId: 2, cantidad: 1, precioUnitario: 500 },
    ]);
    expect(resultado.subtotalesPorRubro.get(1)).toBe(2000);
    expect(resultado.subtotalesPorRubro.get(2)).toBe(500);
    expect(resultado.totalPresupuesto).toBe(2500);
  });

  it("las incidencias porcentuales de todos los ítems suman 100", () => {
    const resultado = calcularResumenPresupuesto([
      { id: 1, rubroId: 1, cantidad: 3, precioUnitario: 100 },
      { id: 2, rubroId: 2, cantidad: 7, precioUnitario: 100 },
    ]);
    const sumaIncidencias = resultado.items.reduce((suma, item) => suma + item.incidenciaPct, 0);
    expect(sumaIncidencias).toBeCloseTo(100, 6);
    expect(resultado.items[0].incidenciaPct).toBeCloseTo(30, 6);
    expect(resultado.items[1].incidenciaPct).toBeCloseTo(70, 6);
  });

  it("no divide por cero cuando el presupuesto está vacío", () => {
    const resultado = calcularResumenPresupuesto([]);
    expect(resultado.totalPresupuesto).toBe(0);
    expect(resultado.items).toHaveLength(0);
  });
});
