// Consolidación del presupuesto de una obra para la hoja de resumen de
// empresa (CLAUDE.md, Fase 4). No agrega fórmulas de costeo nuevas: agrega
// los resultados que ya devuelve el motor de la Fase 2
// (`lib/calculo/apu.ts`, `lib/calculo/coeficiente-resumen.ts`) y desagrega
// lo que ya calcula `calcularCoeficienteResumen` para mostrarlo paso a paso.

import type { ParametrosCoeficiente, ResultadoCoeficienteResumen } from "./coeficiente-resumen";
import { calcularCoeficienteResumen } from "./coeficiente-resumen";

export interface CostoDirectoItem {
  materiales: number;
  manoObraConCargas: number;
  equipos: number;
}

export interface ComposicionCosto {
  materiales: number;
  manoObraConCargas: number;
  manoObraNeta: number;
  aporteCargasSociales: number;
  equipos: number;
  costoDirecto: number;
  materialesPct: number;
  manoObraPct: number;
  equiposPct: number;
}

export function calcularComposicionCosto(
  items: CostoDirectoItem[],
  factorCargasSociales: number
): ComposicionCosto {
  const materiales = items.reduce((suma, item) => suma + item.materiales, 0);
  const manoObraConCargas = items.reduce((suma, item) => suma + item.manoObraConCargas, 0);
  const equipos = items.reduce((suma, item) => suma + item.equipos, 0);

  const manoObraNeta = factorCargasSociales === 0 ? 0 : manoObraConCargas / factorCargasSociales;
  const aporteCargasSociales = manoObraConCargas - manoObraNeta;
  const costoDirecto = materiales + manoObraConCargas + equipos;

  const pct = (valor: number) => (costoDirecto === 0 ? 0 : (valor / costoDirecto) * 100);

  return {
    materiales,
    manoObraConCargas,
    manoObraNeta,
    aporteCargasSociales,
    equipos,
    costoDirecto,
    materialesPct: pct(materiales),
    manoObraPct: pct(manoObraConCargas),
    equiposPct: pct(equipos),
  };
}

export interface LineaDesagregada {
  concepto: string;
  monto: number;
}

export function desagregarCoeficiente(
  resultado: ResultadoCoeficienteResumen,
  parametros: ParametrosCoeficiente
): LineaDesagregada[] {
  return [
    { concepto: "Gastos generales", monto: resultado.subtotal1 - resultado.costoDirecto },
    { concepto: "Beneficio", monto: resultado.subtotal2 - resultado.subtotal1 },
    { concepto: "Seguros", monto: resultado.subtotal2 * (parametros.segurosPct / 100) },
    { concepto: "Gastos financieros", monto: resultado.subtotal2 * (parametros.gastosFinancierosPct / 100) },
    { concepto: "IVA", monto: resultado.subtotal3 * (parametros.ivaPct / 100) },
    { concepto: "Ingresos brutos (IIBB)", monto: resultado.subtotal3 * (parametros.ingresosBrutosPct / 100) },
    { concepto: "Sellado", monto: resultado.subtotal3 * (parametros.selladoPct / 100) },
  ];
}

export function resolverBeneficioParaPrecioObjetivo(
  costoDirecto: number,
  precioObjetivo: number,
  parametrosSinBeneficio: Omit<ParametrosCoeficiente, "beneficioPct">
): number | null {
  if (costoDirecto <= 0) return null;

  const subtotal1 = costoDirecto * (1 + parametrosSinBeneficio.gastosGeneralesPct / 100);
  const factorFinanSeguros = 1 + (parametrosSinBeneficio.gastosFinancierosPct + parametrosSinBeneficio.segurosPct) / 100;
  const factorImpuestos =
    1 +
    (parametrosSinBeneficio.ivaPct + parametrosSinBeneficio.ingresosBrutosPct + parametrosSinBeneficio.selladoPct) /
      100;

  const denominador = subtotal1 * factorFinanSeguros * factorImpuestos;
  if (denominador === 0) return null;

  const factorBeneficio = precioObjetivo / denominador;
  return (factorBeneficio - 1) * 100;
}
