// Carga los datos de ejemplo de seed/datos.ts. Se corre con `npm run db:seed`.
// No duplica: si ya hay insumos cargados, no hace nada (para no ensuciar
// datos reales con datos de ejemplo en una segunda corrida).

import { db } from "../lib/db/client";
import {
  insumo,
  precioInsumo,
  rubro,
  parametrosEmpresa,
  conceptoCargaSocial,
  itemCatalogo,
  componenteApu,
} from "../lib/db/schema";
import {
  FECHA_VIGENCIA_SEED,
  rubrosSeed,
  insumosSeed,
  parametrosEmpresaSeed,
  conceptosCargaSocialSeed,
  itemCatalogoEjemploSeed,
} from "./datos";

async function main() {
  const insumosExistentes = await db.select().from(insumo).limit(1);

  if (insumosExistentes.length > 0) {
    console.log("Ya hay insumos cargados en datos/obra.db — no se cargan datos de ejemplo.");
    console.log("Si querés volver a probar desde cero, respaldá y borrá datos/obra.db primero.");
    return;
  }

  console.log("Cargando rubros...");
  const idsPorCodigoRubro = new Map<string, number>();
  for (const item of rubrosSeed) {
    const [nuevo] = await db.insert(rubro).values(item).returning();
    idsPorCodigoRubro.set(item.codigo, nuevo.id);
  }

  console.log("Cargando insumos y sus precios...");
  const idsPorCodigoInsumo = new Map<string, number>();
  for (const item of insumosSeed) {
    const [nuevo] = await db
      .insert(insumo)
      .values({ codigo: item.codigo, descripcion: item.descripcion, unidad: item.unidad, tipo: item.tipo })
      .returning();
    idsPorCodigoInsumo.set(item.codigo, nuevo.id);

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

  console.log("Cargando ítem de catálogo de ejemplo (mampostería)...");
  const rubroId = idsPorCodigoRubro.get(itemCatalogoEjemploSeed.rubroCodigo);
  if (!rubroId) {
    throw new Error(`Rubro ${itemCatalogoEjemploSeed.rubroCodigo} no encontrado en el seed`);
  }

  const [itemEjemplo] = await db
    .insert(itemCatalogo)
    .values({
      codigo: itemCatalogoEjemploSeed.codigo,
      rubroId,
      descripcion: itemCatalogoEjemploSeed.descripcion,
      unidad: itemCatalogoEjemploSeed.unidad,
      origen: "sistema",
      creadoEn: FECHA_VIGENCIA_SEED,
    })
    .returning();

  for (const componente of itemCatalogoEjemploSeed.componentes) {
    const insumoId = idsPorCodigoInsumo.get(componente.insumoCodigo);
    if (!insumoId) {
      throw new Error(`Insumo ${componente.insumoCodigo} no encontrado en el seed`);
    }

    await db.insert(componenteApu).values({
      itemCatalogoId: itemEjemplo.id,
      insumoId,
      tipo: componente.tipo,
      cantidadUnitaria: "cantidadUnitaria" in componente ? componente.cantidadUnitaria : null,
      desperdicioPct: "desperdicioPct" in componente ? componente.desperdicioPct : null,
      rendimientoHoras: "rendimientoHoras" in componente ? componente.rendimientoHoras : null,
    });
  }

  console.log(
    `Listo: ${rubrosSeed.length} rubros, ${insumosSeed.length} insumos, ` +
      `parámetros de empresa, ${conceptosCargaSocialSeed.length} conceptos de cargas sociales ` +
      `y 1 ítem de catálogo de ejemplo con ${itemCatalogoEjemploSeed.componentes.length} componentes.`
  );
}

main()
  .catch((error) => {
    console.error("Error cargando los datos de ejemplo:", error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
