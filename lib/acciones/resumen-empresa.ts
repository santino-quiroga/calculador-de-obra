"use server";

// Consolida el presupuesto de una obra para la hoja de resumen de empresa
// (Fase 4). Reutiliza tal cual el motor de cálculo de la Fase 2
// (calcularApuDeItem) y las funciones puras de resumen-empresa.ts — acá no
// vive ninguna fórmula de costeo nueva, solo la agregación.

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { conceptoCargaSocial, presupuestoItem } from "@/lib/db/schema";
import { calcularApuDeItem } from "@/lib/acciones/catalogo";
import { obtenerObra } from "@/lib/acciones/obras";
import { obtenerParametrosEmpresa } from "@/lib/acciones/parametros-empresa";
import { calcularFactorCargasSociales } from "@/lib/calculo/cargas-sociales";
import { calcularCoeficienteResumen, type ParametrosCoeficiente } from "@/lib/calculo/coeficiente-resumen";
import {
  calcularComposicionCosto,
  desagregarCoeficiente,
  type CostoDirectoItem,
} from "@/lib/calculo/resumen-empresa";

export async function obtenerResumenObra(obraId: number) {
  const obra = await obtenerObra(obraId);
  if (!obra) return null;

  const [items, conceptos, parametrosEmpresa] = await Promise.all([
    db.select().from(presupuestoItem).where(eq(presupuestoItem.obraId, obraId)),
    db.select().from(conceptoCargaSocial).where(eq(conceptoCargaSocial.activo, true)),
    obtenerParametrosEmpresa(),
  ]);

  const factorCargasSociales = calcularFactorCargasSociales(
    conceptos.map((c) => ({
      nombre: c.nombre,
      alicuotaPct: c.alicuotaPct,
      baseAplicacion: c.baseAplicacion,
      orden: c.orden,
    }))
  ).factor;

  const itemsCosto: CostoDirectoItem[] = [];
  let tieneErrores = false;

  for (const item of items) {
    if (item.itemCatalogoId === null) continue;

    const calculo = await calcularApuDeItem(item.itemCatalogoId, obra.fechaBasePrecios);
    if (calculo.apu.tieneErrores) tieneErrores = true;

    itemsCosto.push({
      materiales: calculo.apu.subtotalMateriales * item.cantidad,
      manoObraConCargas: calculo.apu.subtotalManoObra * item.cantidad,
      equipos: calculo.apu.subtotalEquipos * item.cantidad,
    });
  }

  const composicion = calcularComposicionCosto(itemsCosto, factorCargasSociales);

  const parametrosPorDefecto: ParametrosCoeficiente = parametrosEmpresa ?? {
    gastosGeneralesPct: 0,
    beneficioPct: 0,
    ingresosBrutosPct: 0,
    ivaPct: 0,
    selladoPct: 0,
    gastosFinancierosPct: 0,
    segurosPct: 0,
  };

  const coeficiente = calcularCoeficienteResumen(composicion.costoDirecto, parametrosPorDefecto);
  const desagregado = desagregarCoeficiente(coeficiente, parametrosPorDefecto);

  return {
    obra,
    composicion,
    parametrosPorDefecto,
    coeficiente,
    desagregado,
    tieneErrores,
    sinParametrosGuardados: parametrosEmpresa === null,
  };
}
