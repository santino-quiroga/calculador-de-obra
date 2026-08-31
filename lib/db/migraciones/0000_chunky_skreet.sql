CREATE TABLE `apu_snapshot` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`presupuesto_item_id` integer NOT NULL,
	`json_composicion` text NOT NULL,
	`fecha_snapshot` text NOT NULL,
	`costo_unitario_congelado` real NOT NULL,
	FOREIGN KEY (`presupuesto_item_id`) REFERENCES `presupuesto_item`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `avance_real` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_tarea_id` integer NOT NULL,
	`periodo` text NOT NULL,
	`cantidad_ejecutada` real,
	`porcentaje_ejecutado` real,
	`fecha_carga` text NOT NULL,
	`observacion` text,
	FOREIGN KEY (`plan_tarea_id`) REFERENCES `plan_tarea`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `certificado` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`obra_id` integer NOT NULL,
	`numero` integer NOT NULL,
	`periodo` text NOT NULL,
	`estado` text DEFAULT 'borrador' NOT NULL,
	`monto_bruto` real NOT NULL,
	`desc_anticipo` real DEFAULT 0 NOT NULL,
	`desc_fondo_reparo` real DEFAULT 0 NOT NULL,
	`monto_neto` real NOT NULL,
	FOREIGN KEY (`obra_id`) REFERENCES `obra`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `componente_apu` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_catalogo_id` integer NOT NULL,
	`insumo_id` integer NOT NULL,
	`tipo` text NOT NULL,
	`cantidad_unitaria` real,
	`desperdicio_pct` real,
	`rendimiento_horas` real,
	`observacion` text,
	FOREIGN KEY (`item_catalogo_id`) REFERENCES `item_catalogo`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`insumo_id`) REFERENCES `insumo`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `concepto_carga_social` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`alicuota_pct` real NOT NULL,
	`base_aplicacion` text NOT NULL,
	`orden` integer DEFAULT 0 NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`observacion` text
);
--> statement-breakpoint
CREATE TABLE `insumo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`codigo` text NOT NULL,
	`descripcion` text NOT NULL,
	`unidad` text NOT NULL,
	`tipo` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `insumo_codigo_unique` ON `insumo` (`codigo`);--> statement-breakpoint
CREATE TABLE `item_catalogo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`codigo` text NOT NULL,
	`rubro_id` integer NOT NULL,
	`descripcion` text NOT NULL,
	`unidad` text NOT NULL,
	`origen` text DEFAULT 'sistema' NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`creado_en` text NOT NULL,
	FOREIGN KEY (`rubro_id`) REFERENCES `rubro`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `item_catalogo_codigo_unique` ON `item_catalogo` (`codigo`);--> statement-breakpoint
CREATE TABLE `obra` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`comitente` text,
	`ubicacion` text,
	`fecha_base_precios` text NOT NULL,
	`estado` text DEFAULT 'borrador' NOT NULL,
	`tipo_licitacion` text,
	`anticipo_pct` real,
	`fondo_reparo_pct` real
);
--> statement-breakpoint
CREATE TABLE `parametros_empresa` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`gastos_generales_pct` real NOT NULL,
	`beneficio_pct` real NOT NULL,
	`ingresos_brutos_pct` real NOT NULL,
	`iva_pct` real NOT NULL,
	`sellado_pct` real NOT NULL,
	`gastos_financieros_pct` real NOT NULL,
	`seguros_pct` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_tarea` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`obra_id` integer NOT NULL,
	`presupuesto_item_id` integer,
	`rubro_id` integer,
	`fecha_inicio` text NOT NULL,
	`fecha_fin` text NOT NULL,
	`curva` text DEFAULT 'lineal' NOT NULL,
	`distribucion_manual_json` text,
	FOREIGN KEY (`obra_id`) REFERENCES `obra`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`presupuesto_item_id`) REFERENCES `presupuesto_item`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rubro_id`) REFERENCES `rubro`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `precio_insumo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`insumo_id` integer NOT NULL,
	`fecha_vigencia` text NOT NULL,
	`precio` real NOT NULL,
	`fuente` text,
	FOREIGN KEY (`insumo_id`) REFERENCES `insumo`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `presupuesto_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`obra_id` integer NOT NULL,
	`nro_item` text NOT NULL,
	`rubro_id` integer NOT NULL,
	`item_catalogo_id` integer,
	`descripcion` text NOT NULL,
	`unidad` text NOT NULL,
	`cantidad` real NOT NULL,
	`orden` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`obra_id`) REFERENCES `obra`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rubro_id`) REFERENCES `rubro`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_catalogo_id`) REFERENCES `item_catalogo`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rubro` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`codigo` text NOT NULL,
	`nombre` text NOT NULL,
	`orden` integer DEFAULT 0 NOT NULL,
	`activo` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rubro_codigo_unique` ON `rubro` (`codigo`);