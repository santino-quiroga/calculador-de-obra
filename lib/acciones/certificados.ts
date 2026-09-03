"use server";

// Certificados de obra (Fase 8, CLAUDE.md módulo 10). Un certificado no se
// carga a mano: se GENERA a partir de los avances ya cargados en Control de
// obra (Fase 7). El monto bruto de un período es exactamente el que ya
// calcula la curva real de esa fase (cantidad × precio o % × contractual),
// no hay una fórmula de costeo nueva acá — solo descuentos y acumulados.

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/client";
import { certificado } from "@/lib/db/schema";
import { obtenerObra } from "@/lib/acciones/obras";
import { listarControlDeObra } from "@/lib/acciones/control-obra";
import { calcularCertificado, siguienteNumeroCertificado } from "@/lib/calculo/certificados";

const RUTA = "/certificados";

// Certificados ya emitidos ordenados por período, con su acumulado bruto
// corrido — así cada fila nueva sabe "cuánto se certificó antes de esto".
async function listarConAcumulados(obraId: number) {
  const filas = await db.select().from(certificado).where(eq(certificado.obraId, obraId));
  const ordenadas = [...filas].sort((a, b) => (a.periodo < b.periodo ? -1 : a.periodo > b.periodo ? 1 : 0));

  let acumulado = 0;
  return ordenadas.map((fila) => {
    const acumuladoAnterior = acumulado;
    acumulado += fila.montoBruto;
    return { ...fila, acumuladoBrutoAnterior: acumuladoAnterior, acumuladoBrutoActual: acumulado };
  });
}

export async function listarCertificados(obraId: number) {
  const obraFila = await obtenerObra(obraId);
  if (!obraFila) return null;

  return { obra: obraFila, certificados: await listarConAcumulados(obraId) };
}

// Períodos con avance real cargado (Fase 7) que todavía no tienen un
// certificado — son los únicos que se pueden certificar.
export async function listarPeriodosCertificables(obraId: number) {
  const [control, certificadosDb] = await Promise.all([
    listarControlDeObra(obraId),
    db.select({ periodo: certificado.periodo }).from(certificado).where(eq(certificado.obraId, obraId)),
  ]);
  if (!control) return [];

  const periodosCertificados = new Set(certificadosDb.map((c) => c.periodo));
  return control.curvaRealGeneral.map((p) => p.periodo).filter((periodo) => !periodosCertificados.has(periodo));
}

const esquemaGenerarCertificado = z.object({
  periodo: z.string().regex(/^\d{4}-\d{2}$/, "El período tiene que ser un mes (AAAA-MM)"),
});

export async function generarCertificado(obraId: number, datosCrudos: unknown) {
  const datos = esquemaGenerarCertificado.parse(datosCrudos);

  const obraFila = await obtenerObra(obraId);
  if (!obraFila) throw new Error("La obra no existe");

  const [control, existentes] = await Promise.all([listarControlDeObra(obraId), listarConAcumulados(obraId)]);
  if (!control) throw new Error("La obra no existe");

  if (existentes.some((c) => c.periodo === datos.periodo)) {
    throw new Error(`Ya existe un certificado para ${datos.periodo}`);
  }
  const periodoMasReciente = existentes.at(-1)?.periodo;
  if (periodoMasReciente && datos.periodo <= periodoMasReciente) {
    throw new Error(`Los certificados van en orden: el último es de ${periodoMasReciente}`);
  }

  const puntoPeriodo = control.curvaRealGeneral.find((p) => p.periodo === datos.periodo);
  if (!puntoPeriodo) {
    throw new Error(`No hay avance real cargado para ${datos.periodo} en Control de obra`);
  }

  const acumuladoBrutoAnterior = existentes.at(-1)?.acumuladoBrutoActual ?? 0;
  const resultado = calcularCertificado({
    montoBruto: puntoPeriodo.montoPeriodo,
    anticipoPct: obraFila.anticipoPct ?? 0,
    fondoReparoPct: obraFila.fondoReparoPct ?? 0,
    acumuladoBrutoAnterior,
  });

  await db.insert(certificado).values({
    obraId,
    numero: siguienteNumeroCertificado(existentes),
    periodo: datos.periodo,
    estado: "borrador",
    montoBruto: resultado.montoBruto,
    descAnticipo: resultado.descAnticipo,
    descFondoReparo: resultado.descFondoReparo,
    montoNeto: resultado.montoNeto,
  });

  revalidatePath(RUTA);
}

const ORDEN_ESTADOS = ["borrador", "emitido", "aprobado"] as const;

const esquemaCambiarEstado = z.object({
  estado: z.enum(ORDEN_ESTADOS),
});

export async function cambiarEstadoCertificado(id: number, datosCrudos: unknown) {
  const datos = esquemaCambiarEstado.parse(datosCrudos);

  const [fila] = await db.select().from(certificado).where(eq(certificado.id, id));
  if (!fila) throw new Error("El certificado no existe");

  if (ORDEN_ESTADOS.indexOf(datos.estado) < ORDEN_ESTADOS.indexOf(fila.estado as (typeof ORDEN_ESTADOS)[number])) {
    throw new Error("Un certificado no puede volver a un estado anterior");
  }

  await db.update(certificado).set({ estado: datos.estado }).where(eq(certificado.id, id));
  revalidatePath(RUTA);
}

export async function eliminarCertificado(id: number) {
  const [fila] = await db.select().from(certificado).where(eq(certificado.id, id));
  if (!fila) return;
  if (fila.estado !== "borrador") {
    throw new Error("Solo se puede borrar un certificado en borrador");
  }

  await db.delete(certificado).where(eq(certificado.id, id));
  revalidatePath(RUTA);
}

export async function obtenerCertificadoParaImprimir(id: number) {
  const [fila] = await db.select().from(certificado).where(eq(certificado.id, id));
  if (!fila) return null;

  const obraFila = await obtenerObra(fila.obraId);
  if (!obraFila) return null;

  const conAcumulados = await listarConAcumulados(fila.obraId);
  const conAcumulado = conAcumulados.find((c) => c.id === id)!;

  return { certificado: conAcumulado, obra: obraFila };
}
