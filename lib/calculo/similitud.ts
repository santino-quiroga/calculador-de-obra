// Detección de ítems de catálogo "parecidos" a una descripción nueva, para
// avisar antes de duplicar (Fase 5, prompt: "avisarme si ya existe un ítem
// parecido"). Comparación simple y explicable: se normaliza (sin tildes, sin
// mayúsculas, sin espacios de más) y se compara por igualdad o por
// contención de una descripción dentro de la otra. No hace falta nada más
// sofisticado — el usuario decide en la pantalla si de verdad es un duplicado.

export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // saca tildes/diacríticos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export interface ItemCatalogoParaComparar {
  id: number;
  rubroId: number;
  descripcion: string;
}

export function buscarItemsParecidos<T extends ItemCatalogoParaComparar>(
  descripcionNueva: string,
  rubroId: number,
  itemsExistentes: T[]
): T[] {
  const normalizada = normalizarTexto(descripcionNueva);
  if (normalizada.length === 0) return [];

  return itemsExistentes.filter((item) => {
    if (item.rubroId !== rubroId) return false;
    const normalizadaExistente = normalizarTexto(item.descripcion);
    return (
      normalizadaExistente === normalizada ||
      normalizadaExistente.includes(normalizada) ||
      normalizada.includes(normalizadaExistente)
    );
  });
}
