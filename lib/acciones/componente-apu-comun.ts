// Validación y normalización de una línea de componente de APU, compartida
// entre el catálogo (componente_apu) y el ítem manual del presupuesto
// (componente_presupuesto_item, Fase 5) — mismos campos en ambas tablas.
// Sin "use server": no toca la DB, así que no puede vivir en un archivo de
// Server Actions (esas solo pueden exportar funciones async).

import { z } from "zod";

const esquemaComponenteMaterial = z.object({
  tipo: z.literal("material"),
  insumoId: z.number().int().positive(),
  cantidadUnitaria: z.number().positive("La cantidad tiene que ser mayor a cero"),
  desperdicioPct: z.number().min(0, "El desperdicio no puede ser negativo"),
  observacion: z.string().trim().optional(),
});

const esquemaComponenteConRendimiento = z.object({
  tipo: z.enum(["mano_obra", "equipo"]),
  insumoId: z.number().int().positive(),
  rendimientoHoras: z.number().positive("El rendimiento tiene que ser mayor a cero"),
  observacion: z.string().trim().optional(),
});

export const esquemaComponente = z.discriminatedUnion("tipo", [
  esquemaComponenteMaterial,
  esquemaComponenteConRendimiento,
]);

export function normalizarComponente(datos: z.infer<typeof esquemaComponente>) {
  if (datos.tipo === "material") {
    return {
      tipo: datos.tipo,
      insumoId: datos.insumoId,
      cantidadUnitaria: datos.cantidadUnitaria,
      desperdicioPct: datos.desperdicioPct,
      rendimientoHoras: null,
      observacion: datos.observacion ?? null,
    };
  }

  return {
    tipo: datos.tipo,
    insumoId: datos.insumoId,
    cantidadUnitaria: null,
    desperdicioPct: null,
    rendimientoHoras: datos.rendimientoHoras,
    observacion: datos.observacion ?? null,
  };
}
