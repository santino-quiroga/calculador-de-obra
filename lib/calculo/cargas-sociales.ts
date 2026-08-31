// Factor de cargas sociales, en cascada (CLAUDE.md 6.1 y 5).
//
// Criterio de cascada (confirmado con el usuario en la Fase 2, ver
// docs/CLAUDE.md sección 10): cada concepto se aplica sobre el total
// acumulado hasta el paso anterior, en el orden que se le dio a cada uno.
// La única excepción es la base "salario_basico": esos conceptos siempre
// se calculan sobre el sueldo básico original (nunca sobre lo acumulado),
// para que dos conceptos "sobre el básico" no se multipliquen entre sí.

export type BaseAplicacionCargaSocial =
  | "salario_basico"
  | "subtotal_remunerativo"
  | "base_aportes"
  | "subtotal_liquidado";

export interface ConceptoCargaSocialInput {
  nombre: string;
  alicuotaPct: number;
  baseAplicacion: BaseAplicacionCargaSocial;
  orden: number;
}

export interface PasoCargaSocial {
  concepto: string;
  alicuotaPct: number;
  baseAplicacion: BaseAplicacionCargaSocial;
  montoBase: number;
  incremento: number;
  acumulado: number;
}

export interface ResultadoCargasSociales {
  factor: number;
  pasos: PasoCargaSocial[];
}

const SALARIO_BASICO = 1;

export function calcularFactorCargasSociales(
  conceptos: ConceptoCargaSocialInput[]
): ResultadoCargasSociales {
  const ordenados = [...conceptos].sort((a, b) => a.orden - b.orden);

  let acumulado = SALARIO_BASICO;
  const pasos: PasoCargaSocial[] = [];

  for (const concepto of ordenados) {
    const montoBase = concepto.baseAplicacion === "salario_basico" ? SALARIO_BASICO : acumulado;
    const incremento = montoBase * (concepto.alicuotaPct / 100);
    acumulado += incremento;

    pasos.push({
      concepto: concepto.nombre,
      alicuotaPct: concepto.alicuotaPct,
      baseAplicacion: concepto.baseAplicacion,
      montoBase,
      incremento,
      acumulado,
    });
  }

  return { factor: acumulado, pasos };
}
