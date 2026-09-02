import { describe, expect, it } from "vitest";
import { buscarItemsParecidos, normalizarTexto } from "./similitud";

describe("normalizarTexto", () => {
  it("saca tildes, pasa a minúsculas y colapsa espacios", () => {
    expect(normalizarTexto("Mampostería  de Ladrillo   Hueco")).toBe("mamposteria de ladrillo hueco");
  });
});

describe("buscarItemsParecidos", () => {
  const existentes = [
    { id: 1, rubroId: 10, descripcion: "Mampostería de ladrillo hueco 12 cm" },
    { id: 2, rubroId: 10, descripcion: "Contrapiso de hormigón" },
    { id: 3, rubroId: 20, descripcion: "Mampostería de ladrillo hueco 12 cm" }, // otro rubro
  ];

  it("encuentra coincidencia exacta (ignorando tildes/mayúsculas) dentro del mismo rubro", () => {
    const resultado = buscarItemsParecidos("MAMPOSTERIA DE LADRILLO HUECO 12 CM", 10, existentes);
    expect(resultado.map((i) => i.id)).toEqual([1]);
  });

  it("no compara contra ítems de otro rubro", () => {
    const resultado = buscarItemsParecidos("Mampostería de ladrillo hueco 12 cm", 30, existentes);
    expect(resultado).toEqual([]);
  });

  it("encuentra coincidencia cuando la descripción nueva está contenida en la existente", () => {
    const resultado = buscarItemsParecidos("ladrillo hueco 12", 10, existentes);
    expect(resultado.map((i) => i.id)).toEqual([1]);
  });

  it("no encuentra nada si no hay parecido", () => {
    const resultado = buscarItemsParecidos("Cielorraso suspendido", 10, existentes);
    expect(resultado).toEqual([]);
  });

  it("devuelve vacío si la descripción nueva está vacía", () => {
    expect(buscarItemsParecidos("   ", 10, existentes)).toEqual([]);
  });
});
