// Coeficiente resumen, en cascada (CLAUDE.md 6.2). Decisión de Fase 0: los
// impuestos sobre facturación (IVA, IIBB, sellado) se suman directo sobre el
// subtotal 3, no se despejan dividiendo.

export interface ParametrosCoeficiente {
  gastosGeneralesPct: number;
  beneficioPct: number;
  ingresosBrutosPct: number;
  ivaPct: number;
  selladoPct: number;
  gastosFinancierosPct: number;
  segurosPct: number;
}

export interface PasoCoeficiente {
  paso: string;
  detalle: string;
  valor: number;
}

export interface ResultadoCoeficienteResumen {
  costoDirecto: number;
  subtotal1: number;
  subtotal2: number;
  subtotal3: number;
  impuestos: number;
  precioFinal: number;
  coeficienteK: number;
  pasos: PasoCoeficiente[];
}

export function calcularCoeficienteResumen(
  costoDirecto: number,
  parametros: ParametrosCoeficiente
): ResultadoCoeficienteResumen {
  const subtotal1 = costoDirecto * (1 + parametros.gastosGeneralesPct / 100);
  const subtotal2 = subtotal1 * (1 + parametros.beneficioPct / 100);
  const subtotal3 =
    subtotal2 * (1 + (parametros.gastosFinancierosPct + parametros.segurosPct) / 100);
  const impuestos =
    subtotal3 * ((parametros.ivaPct + parametros.ingresosBrutosPct + parametros.selladoPct) / 100);
  const precioFinal = subtotal3 + impuestos;
  const coeficienteK = costoDirecto === 0 ? 0 : precioFinal / costoDirecto;

  return {
    costoDirecto,
    subtotal1,
    subtotal2,
    subtotal3,
    impuestos,
    precioFinal,
    coeficienteK,
    pasos: [
      { paso: "Costo directo", detalle: "Materiales + mano de obra + equipos", valor: costoDirecto },
      {
        paso: "Gastos generales",
        detalle: `× (1 + ${parametros.gastosGeneralesPct}%)`,
        valor: subtotal1,
      },
      { paso: "Beneficio", detalle: `× (1 + ${parametros.beneficioPct}%)`, valor: subtotal2 },
      {
        paso: "Financieros y seguros",
        detalle: `× (1 + ${parametros.gastosFinancierosPct}% + ${parametros.segurosPct}%)`,
        valor: subtotal3,
      },
      {
        paso: "Impuestos (IVA + IIBB + Sellado)",
        detalle: `Subtotal 3 × (${parametros.ivaPct}% + ${parametros.ingresosBrutosPct}% + ${parametros.selladoPct}%)`,
        valor: impuestos,
      },
      { paso: "Precio final", detalle: "Subtotal 3 + impuestos", valor: precioFinal },
    ],
  };
}
