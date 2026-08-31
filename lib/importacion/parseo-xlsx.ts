// Utilidades para leer un .xlsx del lado del navegador (la importación no
// sube el archivo al servidor: se parsea acá y recién las filas ya
// interpretadas viajan a la acción de servidor). Sin "use client" porque
// son funciones puras, se importan desde un componente cliente.

import ExcelJS from "exceljs";

export interface HojaParseada {
  encabezados: string[];
  filas: string[][];
}

function celdaATexto(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) return "";
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if (typeof valor === "object") {
    if ("text" in valor && typeof valor.text === "string") return valor.text;
    if ("result" in valor && valor.result !== undefined && valor.result !== null) {
      return celdaATexto(valor.result as ExcelJS.CellValue);
    }
    return "";
  }
  return String(valor);
}

export async function parsearXlsx(archivo: File): Promise<HojaParseada> {
  const buffer = await archivo.arrayBuffer();
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(buffer);
  const hoja = libro.worksheets[0];

  if (!hoja) {
    return { encabezados: [], filas: [] };
  }

  const filasCrudas: string[][] = [];
  hoja.eachRow((fila) => {
    const valores = (fila.values as ExcelJS.CellValue[]).slice(1); // índice 0 es hueco
    filasCrudas.push(valores.map(celdaATexto));
  });

  const [encabezados, ...filas] = filasCrudas;
  return {
    encabezados: encabezados ?? [],
    filas: filas.filter((f) => f.some((valor) => valor !== "")),
  };
}

// Acepta "1.234,56" (formato argentino) y "1234.56" por igual.
export function parsearNumeroAr(texto: string): number | null {
  const limpio = texto.trim();
  if (limpio === "") return null;

  const normalizado =
    limpio.includes(",") && limpio.lastIndexOf(",") > limpio.lastIndexOf(".")
      ? limpio.replace(/\./g, "").replace(",", ".")
      : limpio.replace(/,/g, "");

  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

function normalizarTexto(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

const TIPOS_RECONOCIDOS: Record<string, "material" | "mano_obra" | "equipo"> = {
  material: "material",
  materiales: "material",
  "mano de obra": "mano_obra",
  mano_obra: "mano_obra",
  mo: "mano_obra",
  equipo: "equipo",
  equipos: "equipo",
};

export function normalizarTipo(texto: string): "material" | "mano_obra" | "equipo" | null {
  return TIPOS_RECONOCIDOS[normalizarTexto(texto)] ?? null;
}

// Acepta "DD/MM/YYYY", "DD-MM-YYYY" o ya en formato ISO "YYYY-MM-DD".
export function parsearFechaAr(texto: string): string | null {
  const limpio = texto.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(limpio)) return limpio;

  const coincidencia = limpio.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!coincidencia) return null;

  const [, dia, mes, anio] = coincidencia;
  return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

export function adivinarColumna(encabezados: string[], pistas: string[]): number | null {
  const indice = encabezados.findIndex((encabezado) => {
    const normalizado = normalizarTexto(encabezado);
    return pistas.some((pista) => normalizado.includes(pista));
  });
  return indice === -1 ? null : indice;
}
