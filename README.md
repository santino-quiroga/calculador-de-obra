# Programa de obra

Aplicación local (corre en tu computadora, se usa desde el navegador) para
cómputos, presupuestos y control de obra. La especificación completa está en
[`docs/CLAUDE.md`](docs/CLAUDE.md).

## Cómo arrancar

Necesitás [Node.js](https://nodejs.org/) instalado (versión 20 o superior).
Parado en esta carpeta, en la terminal:

```bash
npm install
npm run dev
```

Después abrís `http://localhost:3000` en el navegador.

## Cómo respaldar tus datos

Todos tus datos viven en un único archivo: `datos/obra.db`. Para respaldarlo,
copialo a otra carpeta con la fecha en el nombre, igual que harías con un
`.xlsx`:

```bash
cp datos/obra.db datos/backups/obra-2026-08-30.db
```

Ese archivo nunca se sube a git (está en `.gitignore`) — es tuyo y vive solo en
tu computadora.

## Qué se puede hacer hoy (Fase 0)

La app abre y podés navegar entre las siete secciones del menú de la
izquierda. Todavía no hay datos ni funcionalidad — cada sección se completa en
su fase correspondiente, según el plan de `docs/CLAUDE.md` (sección 8).

## Estructura de carpetas

```
app/              páginas de la aplicación (una por módulo)
components/       piezas de interfaz reutilizables
lib/db/           esquema de la base de datos (Drizzle ORM)
lib/calculo/      lógica de cálculo de APU y presupuesto (Fase 2 en adelante)
datos/            datos del usuario: obra.db y sus respaldos (no se versiona)
seed/             datos de ejemplo para probar sin cargar todo a mano
docs/             CLAUDE.md (especificación) y material de referencia
```

## Tests

```bash
npm run test
```
