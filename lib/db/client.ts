// Punto único de acceso a la base de datos. Todo el resto de la app importa
// `db` de acá, nunca abre `better-sqlite3` por su cuenta.

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "node:path";
import fs from "node:fs";

const carpetaDatos = path.join(process.cwd(), "datos");
if (!fs.existsSync(carpetaDatos)) {
  fs.mkdirSync(carpetaDatos, { recursive: true });
}

const sqlite = new Database(path.join(carpetaDatos, "obra.db"));
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
