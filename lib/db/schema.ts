// Esquema de la base de datos, según el modelo de datos de docs/CLAUDE.md (sección 5).
// Nombres de tabla y columna en español a propósito: el usuario tiene que poder
// leer la base si alguna vez la abre con un visor de SQLite.
//
// Fase 0: solo se crean las tablas (esqueleto). Sin datos todavía.

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// Catálogo e insumos
// ---------------------------------------------------------------------------

export const insumo = sqliteTable("insumo", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  codigo: text("codigo").notNull().unique(),
  descripcion: text("descripcion").notNull(),
  unidad: text("unidad").notNull(),
  tipo: text("tipo", { enum: ["material", "mano_obra", "equipo"] }).notNull(),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
});

// Historial de precios: nunca se pisa un registro, se inserta uno nuevo (CLAUDE.md 4.2)
export const precioInsumo = sqliteTable("precio_insumo", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  insumoId: integer("insumo_id")
    .notNull()
    .references(() => insumo.id),
  fechaVigencia: text("fecha_vigencia").notNull(), // 'YYYY-MM-DD'
  precio: real("precio").notNull(),
  fuente: text("fuente"),
});

export const rubro = sqliteTable("rubro", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  codigo: text("codigo").notNull().unique(),
  nombre: text("nombre").notNull(),
  orden: integer("orden").notNull().default(0),
});

// El "subrubro" / tarea tipo. La receta maestra reutilizable entre obras.
export const itemCatalogo = sqliteTable("item_catalogo", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  codigo: text("codigo").notNull().unique(),
  rubroId: integer("rubro_id")
    .notNull()
    .references(() => rubro.id),
  descripcion: text("descripcion").notNull(),
  unidad: text("unidad", { enum: ["m2", "m3", "ml", "u", "gl", "kg"] }).notNull(),
  origen: text("origen", { enum: ["sistema", "usuario"] }).notNull().default("sistema"),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  creadoEn: text("creado_en").notNull(),
});

// Líneas de la receta de un ítem de catálogo
export const componenteApu = sqliteTable("componente_apu", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemCatalogoId: integer("item_catalogo_id")
    .notNull()
    .references(() => itemCatalogo.id),
  insumoId: integer("insumo_id")
    .notNull()
    .references(() => insumo.id),
  tipo: text("tipo", { enum: ["material", "mano_obra", "equipo"] }).notNull(),
  cantidadUnitaria: real("cantidad_unitaria"), // consumo por unidad de ítem (materiales)
  desperdicioPct: real("desperdicio_pct"), // solo materiales
  rendimientoHoras: real("rendimiento_horas"), // solo mano de obra y equipos
  observacion: text("observacion"),
});

// ---------------------------------------------------------------------------
// Parámetros de empresa y obra
// ---------------------------------------------------------------------------

export const parametrosEmpresa = sqliteTable("parametros_empresa", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gastosGeneralesPct: real("gastos_generales_pct").notNull(),
  beneficioPct: real("beneficio_pct").notNull(),
  ingresosBrutosPct: real("ingresos_brutos_pct").notNull(),
  ivaPct: real("iva_pct").notNull(),
  selladoPct: real("sellado_pct").notNull(),
  gastosFinancierosPct: real("gastos_financieros_pct").notNull(),
  segurosPct: real("seguros_pct").notNull(),
});

// Desglose de cargas sociales por concepto (decisión Fase 0). Reemplaza a un
// cargas_sociales_pct único. Ver CLAUDE.md 5 y 6.1.
export const conceptoCargaSocial = sqliteTable("concepto_carga_social", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  alicuotaPct: real("alicuota_pct").notNull(),
  baseAplicacion: text("base_aplicacion", {
    enum: ["salario_basico", "subtotal_remunerativo", "base_aportes", "subtotal_liquidado"],
  }).notNull(),
  orden: integer("orden").notNull().default(0),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  observacion: text("observacion"),
});

export const obra = sqliteTable("obra", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  comitente: text("comitente"),
  ubicacion: text("ubicacion"),
  fechaBasePrecios: text("fecha_base_precios").notNull(),
  estado: text("estado", {
    enum: ["borrador", "presentado", "en_ejecucion", "cerrada"],
  })
    .notNull()
    .default("borrador"),
  tipoLicitacion: text("tipo_licitacion", { enum: ["publica", "privada"] }),
  anticipoPct: real("anticipo_pct"),
  fondoReparoPct: real("fondo_reparo_pct"),
});

// ---------------------------------------------------------------------------
// Presupuesto
// ---------------------------------------------------------------------------

export const presupuestoItem = sqliteTable("presupuesto_item", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  obraId: integer("obra_id")
    .notNull()
    .references(() => obra.id),
  nroItem: text("nro_item").notNull(), // jerárquico: "1", "1.1", "1.2"
  rubroId: integer("rubro_id")
    .notNull()
    .references(() => rubro.id),
  itemCatalogoId: integer("item_catalogo_id").references(() => itemCatalogo.id), // null si es ítem manual
  descripcion: text("descripcion").notNull(),
  unidad: text("unidad").notNull(),
  cantidad: real("cantidad").notNull(),
  orden: integer("orden").notNull().default(0),
});

// Foto congelada al marcar una obra como "Presentada" (CLAUDE.md 4.3)
export const apuSnapshot = sqliteTable("apu_snapshot", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  presupuestoItemId: integer("presupuesto_item_id")
    .notNull()
    .references(() => presupuestoItem.id),
  jsonComposicion: text("json_composicion").notNull(),
  fechaSnapshot: text("fecha_snapshot").notNull(),
  costoUnitarioCongelado: real("costo_unitario_congelado").notNull(),
});

// ---------------------------------------------------------------------------
// Plan y control
// ---------------------------------------------------------------------------

export const planTarea = sqliteTable("plan_tarea", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  obraId: integer("obra_id")
    .notNull()
    .references(() => obra.id),
  presupuestoItemId: integer("presupuesto_item_id").references(() => presupuestoItem.id),
  rubroId: integer("rubro_id").references(() => rubro.id), // para agrupar por rubro
  fechaInicio: text("fecha_inicio").notNull(),
  fechaFin: text("fecha_fin").notNull(),
  curva: text("curva", { enum: ["lineal", "campana", "manual"] })
    .notNull()
    .default("lineal"),
  distribucionManualJson: text("distribucion_manual_json"), // % por período cuando curva='manual'
});

export const avanceReal = sqliteTable("avance_real", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  planTareaId: integer("plan_tarea_id")
    .notNull()
    .references(() => planTarea.id),
  periodo: text("periodo").notNull(), // 'YYYY-MM'
  cantidadEjecutada: real("cantidad_ejecutada"),
  porcentajeEjecutado: real("porcentaje_ejecutado"),
  fechaCarga: text("fecha_carga").notNull(),
  observacion: text("observacion"),
});

export const certificado = sqliteTable("certificado", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  obraId: integer("obra_id")
    .notNull()
    .references(() => obra.id),
  numero: integer("numero").notNull(),
  periodo: text("periodo").notNull(),
  estado: text("estado", { enum: ["borrador", "emitido", "aprobado"] })
    .notNull()
    .default("borrador"),
  montoBruto: real("monto_bruto").notNull(),
  descAnticipo: real("desc_anticipo").notNull().default(0),
  descFondoReparo: real("desc_fondo_reparo").notNull().default(0),
  montoNeto: real("monto_neto").notNull(),
});
