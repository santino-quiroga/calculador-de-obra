"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/client";
import { rubro } from "@/lib/db/schema";

const RUTA = "/bases-maestras";

const esquemaRubro = z.object({
  codigo: z.string().trim().min(1, "Falta el código"),
  nombre: z.string().trim().min(1, "Falta el nombre"),
  orden: z.number().int().default(0),
});

export async function listarRubros() {
  return db.select().from(rubro).orderBy(rubro.orden, rubro.nombre);
}

export async function crearRubro(datosCrudos: unknown) {
  const datos = esquemaRubro.parse(datosCrudos);
  const [nuevo] = await db.insert(rubro).values(datos).returning();
  revalidatePath(RUTA);
  return nuevo;
}

export async function editarRubro(id: number, datosCrudos: unknown) {
  const datos = esquemaRubro.parse(datosCrudos);
  await db.update(rubro).set(datos).where(eq(rubro.id, id));
  revalidatePath(RUTA);
}

export async function cambiarActivoRubro(id: number, activo: boolean) {
  await db.update(rubro).set({ activo }).where(eq(rubro.id, id));
  revalidatePath(RUTA);
}
