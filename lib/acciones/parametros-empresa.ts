"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/client";
import { parametrosEmpresa } from "@/lib/db/schema";

const RUTA = "/bases-maestras";

const esquemaParametros = z.object({
  gastosGeneralesPct: z.number(),
  beneficioPct: z.number(),
  ingresosBrutosPct: z.number(),
  ivaPct: z.number(),
  selladoPct: z.number(),
  gastosFinancierosPct: z.number(),
  segurosPct: z.number(),
});

// Es una sola fila de configuración general (no hay ABM: se edita in situ).
export async function obtenerParametrosEmpresa() {
  const [fila] = await db.select().from(parametrosEmpresa).limit(1);
  return fila ?? null;
}

export async function guardarParametrosEmpresa(datosCrudos: unknown) {
  const datos = esquemaParametros.parse(datosCrudos);
  const existente = await obtenerParametrosEmpresa();

  if (existente) {
    await db.update(parametrosEmpresa).set(datos).where(eq(parametrosEmpresa.id, existente.id));
  } else {
    await db.insert(parametrosEmpresa).values(datos);
  }

  revalidatePath(RUTA);
}
