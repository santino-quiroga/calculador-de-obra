"use server";

// Recibe filas YA mapeadas desde el navegador (ver
// components/bases-maestras/importar-excel-tab.tsx, que lee el .xlsx con
// ExcelJS del lado del cliente). Por cada fila: si el código no existe crea
// el insumo con su primer precio; si ya existe, solo agrega un precio nuevo
// al historial (nunca pisa uno existente, CLAUDE.md 4.2).

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/client";
import { insumo, precioInsumo } from "@/lib/db/schema";

const RUTA = "/bases-maestras";

const esquemaFila = z.object({
  codigo: z.string().trim().min(1),
  descripcion: z.string().trim().min(1),
  unidad: z.string().trim().min(1),
  tipo: z.enum(["material", "mano_obra", "equipo"]),
  precio: z.number().positive(),
  fechaVigencia: z.string().min(1),
});

export type FilaImportacion = z.infer<typeof esquemaFila>;

export async function importarInsumosDesdeExcel(filasCrudas: unknown[]) {
  const creados: string[] = [];
  const preciosAgregados: string[] = [];
  const errores: { fila: number; motivo: string }[] = [];

  const insumosExistentes = await db.select().from(insumo);
  const porCodigo = new Map(insumosExistentes.map((i) => [i.codigo, i]));

  for (let indice = 0; indice < filasCrudas.length; indice++) {
    const resultado = esquemaFila.safeParse(filasCrudas[indice]);

    if (!resultado.success) {
      errores.push({
        fila: indice + 1,
        motivo: resultado.error.issues.map((problema) => problema.message).join(", "),
      });
      continue;
    }

    const fila = resultado.data;
    const existente = porCodigo.get(fila.codigo);

    if (existente) {
      await db.insert(precioInsumo).values({
        insumoId: existente.id,
        fechaVigencia: fila.fechaVigencia,
        precio: fila.precio,
        fuente: "Importación Excel",
      });
      preciosAgregados.push(fila.codigo);
    } else {
      const [nuevoInsumo] = await db
        .insert(insumo)
        .values({
          codigo: fila.codigo,
          descripcion: fila.descripcion,
          unidad: fila.unidad,
          tipo: fila.tipo,
        })
        .returning();

      await db.insert(precioInsumo).values({
        insumoId: nuevoInsumo.id,
        fechaVigencia: fila.fechaVigencia,
        precio: fila.precio,
        fuente: "Importación Excel",
      });

      porCodigo.set(fila.codigo, nuevoInsumo);
      creados.push(fila.codigo);
    }
  }

  revalidatePath(RUTA);

  return {
    creados: creados.length,
    preciosAgregados: preciosAgregados.length,
    errores,
  };
}
