// Costo unitario directo de un ítem (CLAUDE.md 6.1). Función pura: recibe
// la receta (componentes) y el historial de precios ya cargados, resuelve
// cada línea contra la fecha dada, y devuelve el desglose completo. Si a un
// insumo le falta precio vigente, la línea queda marcada con error en vez
// de calcularse mal en silencio (CLAUDE.md 4.4: todo cálculo es trazable).

import { obtenerPrecioVigente, type RegistroPrecio } from "./precios";

export type TipoComponenteApu = "material" | "mano_obra" | "equipo";

export interface ComponenteApuInput {
  id: number;
  insumoId: number;
  tipo: TipoComponenteApu;
  cantidadUnitaria: number | null;
  desperdicioPct: number | null;
  rendimientoHoras: number | null;
}

export interface LineaApuCalculada {
  componenteId: number;
  insumoId: number;
  tipo: TipoComponenteApu;
  costo: number | null;
  error?: string;
  detalle: {
    cantidad?: number;
    desperdicioPct?: number;
    rendimientoHoras?: number;
    precioUnitario?: number;
  };
}

export interface ResultadoApu {
  lineas: LineaApuCalculada[];
  subtotalMateriales: number;
  subtotalManoObra: number;
  subtotalEquipos: number;
  costoDirecto: number;
  tieneErrores: boolean;
}

function calcularLinea(
  componente: ComponenteApuInput,
  vigente: RegistroPrecio,
  factorCargasSociales: number
): LineaApuCalculada {
  const base = {
    componenteId: componente.id,
    insumoId: componente.insumoId,
    tipo: componente.tipo,
  };

  if (componente.tipo === "material") {
    const cantidad = componente.cantidadUnitaria ?? 0;
    const desperdicioPct = componente.desperdicioPct ?? 0;
    const costo = cantidad * (1 + desperdicioPct / 100) * vigente.precio;
    return {
      ...base,
      costo,
      detalle: { cantidad, desperdicioPct, precioUnitario: vigente.precio },
    };
  }

  if (componente.tipo === "mano_obra") {
    const rendimientoHoras = componente.rendimientoHoras ?? 0;
    const costo = rendimientoHoras * vigente.precio * factorCargasSociales;
    return {
      ...base,
      costo,
      detalle: { rendimientoHoras, precioUnitario: vigente.precio },
    };
  }

  const rendimientoHoras = componente.rendimientoHoras ?? 0;
  const costo = rendimientoHoras * vigente.precio;
  return {
    ...base,
    costo,
    detalle: { rendimientoHoras, precioUnitario: vigente.precio },
  };
}

export function calcularCostoApu(
  componentes: ComponenteApuInput[],
  historialPorInsumo: Map<number, RegistroPrecio[]>,
  fecha: string,
  factorCargasSociales: number
): ResultadoApu {
  const lineas: LineaApuCalculada[] = componentes.map((componente) => {
    const historial = historialPorInsumo.get(componente.insumoId) ?? [];
    const vigente = obtenerPrecioVigente(historial, fecha);

    if (!vigente) {
      return {
        componenteId: componente.id,
        insumoId: componente.insumoId,
        tipo: componente.tipo,
        costo: null,
        error: "El insumo no tiene precio vigente a la fecha elegida",
        detalle: {},
      };
    }

    return calcularLinea(componente, vigente, factorCargasSociales);
  });

  const subtotalPorTipo = (tipo: TipoComponenteApu) =>
    lineas.filter((linea) => linea.tipo === tipo).reduce((suma, linea) => suma + (linea.costo ?? 0), 0);

  const subtotalMateriales = subtotalPorTipo("material");
  const subtotalManoObra = subtotalPorTipo("mano_obra");
  const subtotalEquipos = subtotalPorTipo("equipo");

  return {
    lineas,
    subtotalMateriales,
    subtotalManoObra,
    subtotalEquipos,
    costoDirecto: subtotalMateriales + subtotalManoObra + subtotalEquipos,
    tieneErrores: lineas.some((linea) => linea.error !== undefined),
  };
}
