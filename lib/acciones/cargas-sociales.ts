"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/client";
import { conceptoCargaSocial } from "@/lib/db/schema";

const RUTA = "/bases-maestras";

const esquemaConcepto = z.object({
  nombre: z.string().trim().min(1, "Falta el nombre"),
  alicuotaPct: z.number(),
  baseAplicacion: z.enum([
    "salario_basico",
    "subtotal_remunerativo",
    "base_aportes",
    "subtotal_liquidado",
  ]),
  orden: z.number().int().default(0),
  observacion: z.string().trim().optional(),
});

export async function listarConceptosCargaSocial() {
  return db
    .select()
    .from(conceptoCargaSocial)
    .orderBy(conceptoCargaSocial.orden, conceptoCargaSocial.id);
}

export async function crearConceptoCargaSocial(datosCrudos: unknown) {
  const datos = esquemaConcepto.parse(datosCrudos);
  const [nuevo] = await db
    .insert(conceptoCargaSocial)
    .values({ ...datos, observacion: datos.observacion ?? null })
    .returning();
  revalidatePath(RUTA);
  return nuevo;
}

export async function editarConceptoCargaSocial(id: number, datosCrudos: unknown) {
  const datos = esquemaConcepto.parse(datosCrudos);
  await db
    .update(conceptoCargaSocial)
    .set({ ...datos, observacion: datos.observacion ?? null })
    .where(eq(conceptoCargaSocial.id, id));
  revalidatePath(RUTA);
}

export async function cambiarActivoConceptoCargaSocial(id: number, activo: boolean) {
  await db.update(conceptoCargaSocial).set({ activo }).where(eq(conceptoCargaSocial.id, id));
  revalidatePath(RUTA);
}
