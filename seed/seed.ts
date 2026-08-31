// Carga los datos de ejemplo de seed/datos.ts. Se corre con `npm run db:seed`.
// No duplica: si ya hay insumos cargados, no hace nada (para no ensuciar
// datos reales con datos de ejemplo en una segunda corrida).

import { db } from "../lib/db/client";
import { insumo, precioInsumo, rubro, parametrosEmpresa, conceptoCargaSocial } from "../lib/db/schema";
import {
  FECHA_VIGENCIA_SEED,
  rubrosSeed,
  insumosSeed,
  parametrosEmpresaSeed,
  conceptosCargaSocialSeed,
} from "./datos";

async function main() {
  const insumosExistentes = await db.select().from(insumo).limit(1);

  if (insumosExistentes.length > 0) {
    console.log("Ya hay insumos cargados en datos/obra.db — no se cargan datos de ejemplo.");
    console.log("Si querés volver a probar desde cero, respaldá y borrá datos/obra.db primero.");
    return;
  }

  console.log("Cargando rubros...");
  await db.insert(rubro).values(rubrosSeed);

  console.log("Cargando insumos y sus precios...");
  for (const item of insumosSeed) {
    const [nuevo] = await db
      .insert(insumo)
      .values({ codigo: item.codigo, descripcion: item.descripcion, unidad: item.unidad, tipo: item.tipo })
      .returning();

    await db.insert(precioInsumo).values({
      insumoId: nuevo.id,
      fechaVigencia: FECHA_VIGENCIA_SEED,
      precio: item.precio,
      fuente: "Dato de ejemplo (seed)",
    });
  }

  console.log("Cargando parámetros de empresa por defecto...");
  await db.insert(parametrosEmpresa).values(parametrosEmpresaSeed);

  console.log("Cargando conceptos de cargas sociales...");
  await db.insert(conceptoCargaSocial).values(conceptosCargaSocialSeed);

  console.log(
    `Listo: ${rubrosSeed.length} rubros, ${insumosSeed.length} insumos, ` +
      `parámetros de empresa y ${conceptosCargaSocialSeed.length} conceptos de cargas sociales.`
  );
}

main()
  .catch((error) => {
    console.error("Error cargando los datos de ejemplo:", error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
