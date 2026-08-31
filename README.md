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

## Qué se puede hacer hoy (Fase 1)

**Bases maestras** ya funciona completo:

- ABM de insumos (materiales, mano de obra, equipos), con historial de
  precios: cada actualización agrega una fila nueva, nunca pisa la anterior.
- Actualización de precios en lote: seleccionás varios insumos y les aplicás
  un porcentaje con una fecha, en una sola operación.
- Importación de una lista de proveedor en `.xlsx`: mapeás las columnas, ves
  una vista previa, y confirmás.
- ABM de rubros y de conceptos de cargas sociales.
- Parámetros generales de la empresa (gastos generales, beneficio, IVA,
  IIBB, sellado, financieros, seguros).

Para probarlo sin cargar todo a mano:

```bash
npm run db:seed
```

Carga rubros, insumos y parámetros de ejemplo (ver "Datos de ejemplo" abajo).

El resto de las secciones del menú todavía están vacías — se completan en su
fase correspondiente, según el plan de `docs/CLAUDE.md` (sección 8).

## Datos de ejemplo

`npm run db:seed` carga datos **ilustrativos** (rubros y precios típicos de
una obra en Argentina) para que puedas probar la app. No son tu lista real
de precios — cargá la tuya a mano o importándola desde Excel antes de usar
la app para cotizar de verdad. El comando no duplica datos: si ya cargaste
insumos, no hace nada.

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
