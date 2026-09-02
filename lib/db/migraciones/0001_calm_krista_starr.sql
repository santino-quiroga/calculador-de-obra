CREATE TABLE `componente_presupuesto_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`presupuesto_item_id` integer NOT NULL,
	`insumo_id` integer NOT NULL,
	`tipo` text NOT NULL,
	`cantidad_unitaria` real,
	`desperdicio_pct` real,
	`rendimiento_horas` real,
	`observacion` text,
	FOREIGN KEY (`presupuesto_item_id`) REFERENCES `presupuesto_item`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`insumo_id`) REFERENCES `insumo`(`id`) ON UPDATE no action ON DELETE no action
);
