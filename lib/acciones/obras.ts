"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/client";
import { obra } from "@/lib/db/schema";

const RUTA = "/obras";

const esquemaObra = z.object({
  nombre: z.string().trim().min(1, "Falta el nombre"),
  comitente: z.string().trim().optional(),
  ubicacion: z.string().trim().optional(),
  fechaBasePrecios: z.string().min(1, "Falta la fecha base de precios"),
  tipoLicitacion: z.enum(["publica", "privada"]).optional(),
  anticipoPct: z.number().min(0).optional(),
  fondoReparoPct: z.number().min(0).optional(),
});

export async function listarObras() {
  return db.select().from(obra).orderBy(obra.id);
}

export async function obtenerObra(id: number) {
  const [fila] = await db.select().from(obra).where(eq(obra.id, id));
  return fila ?? null;
}

export async function crearObra(datosCrudos: unknown) {
  const datos = esquemaObra.parse(datosCrudos);

  const [nueva] = await db
    .insert(obra)
    .values({
      nombre: datos.nombre,
      comitente: datos.comitente ?? null,
      ubicacion: datos.ubicacion ?? null,
      fechaBasePrecios: datos.fechaBasePrecios,
      tipoLicitacion: datos.tipoLicitacion ?? null,
      anticipoPct: datos.anticipoPct ?? null,
      fondoReparoPct: datos.fondoReparoPct ?? null,
    })
    .returning();

  revalidatePath(RUTA);
  return nueva;
}

export async function editarObra(id: number, datosCrudos: unknown) {
  const datos = esquemaObra.parse(datosCrudos);

  await db
    .update(obra)
    .set({
      nombre: datos.nombre,
      comitente: datos.comitente ?? null,
      ubicacion: datos.ubicacion ?? null,
      fechaBasePrecios: datos.fechaBasePrecios,
      tipoLicitacion: datos.tipoLicitacion ?? null,
      anticipoPct: datos.anticipoPct ?? null,
      fondoReparoPct: datos.fondoReparoPct ?? null,
    })
    .where(eq(obra.id, id));

  revalidatePath(RUTA);
  revalidatePath(`${RUTA}/${id}`);
}

export async function cambiarEstadoObra(id: number, estado: "borrador" | "presentado" | "en_ejecucion" | "cerrada") {
  await db.update(obra).set({ estado }).where(eq(obra.id, id));
  revalidatePath(RUTA);
  revalidatePath(`${RUTA}/${id}`);
}
