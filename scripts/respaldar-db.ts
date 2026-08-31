// Se corre solo, antes de cada `npm run db:push` (hook "predb:push" en
// package.json). Copia datos/obra.db a datos/backups/ con fecha y hora
// antes de tocar el esquema (CLAUDE.md 4.5: respaldo automático antes de
// toda migración).

import fs from "node:fs";
import path from "node:path";

const rutaDb = path.join(process.cwd(), "datos", "obra.db");

if (!fs.existsSync(rutaDb)) {
  console.log("No hay datos/obra.db todavía — no hace falta respaldo.");
  process.exit(0);
}

const carpetaBackups = path.join(process.cwd(), "datos", "backups");
if (!fs.existsSync(carpetaBackups)) {
  fs.mkdirSync(carpetaBackups, { recursive: true });
}

const marcaTiempo = new Date().toISOString().replace(/[:.]/g, "-");
const rutaDestino = path.join(carpetaBackups, `obra-${marcaTiempo}.db`);

fs.copyFileSync(rutaDb, rutaDestino);
console.log(`Respaldo creado: datos/backups/obra-${marcaTiempo}.db`);
