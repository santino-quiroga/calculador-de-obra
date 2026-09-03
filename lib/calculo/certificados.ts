// Certificados de obra (Fase 8, CLAUDE.md módulo 10). Funciones puras: el
// monto bruto de un período no se calcula acá — sale tal cual de la curva
// real de la Fase 7 (lib/calculo/valor-ganado.ts), que ya resuelve cantidad
// × precio o % × contractual para cada avance cargado. Acá solo se aplican
// los descuentos de la obra y se arman los acumulados.

export interface ResultadoCertificado {
  montoBruto: number;
  descAnticipo: number;
  descFondoReparo: number;
  montoNeto: number;
  acumuladoBrutoAnterior: number;
  acumuladoBrutoActual: number;
}

export function calcularCertificado(params: {
  montoBruto: number;
  anticipoPct: number;
  fondoReparoPct: number;
  acumuladoBrutoAnterior: number;
}): ResultadoCertificado {
  const descAnticipo = params.montoBruto * (params.anticipoPct / 100);
  const descFondoReparo = params.montoBruto * (params.fondoReparoPct / 100);
  const montoNeto = params.montoBruto - descAnticipo - descFondoReparo;

  return {
    montoBruto: params.montoBruto,
    descAnticipo,
    descFondoReparo,
    montoNeto,
    acumuladoBrutoAnterior: params.acumuladoBrutoAnterior,
    acumuladoBrutoActual: params.acumuladoBrutoAnterior + params.montoBruto,
  };
}

// Numeración correlativa: el siguiente número es 1 + el mayor ya usado,
// nunca la cantidad de filas (para que borrar un certificado en borrador no
// deje reutilizar un número que ya se le mostró al comitente).
export function siguienteNumeroCertificado(existentes: { numero: number }[]): number {
  if (existentes.length === 0) return 1;
  return Math.max(...existentes.map((c) => c.numero)) + 1;
}
