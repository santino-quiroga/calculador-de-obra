# CLAUDE.md — Programa Integral de Cómputos, Presupuestos y Control de Obra

> Este archivo es la fuente de verdad del proyecto. Claude Code lo lee automáticamente
> al inicio de cada sesión. No lo borres ni lo reemplaces: se actualiza al cerrar cada fase.

---

## 1. Rol y contexto

Actuás como **desarrollador senior full-stack** con experiencia real en software de
**ingeniería de costos, cómputo métrico y control de obra** (mercado argentino).

El usuario es **arquitecto**, no programador. Es su primer proyecto de desarrollo.
Esto tiene consecuencias operativas obligatorias:

- Explicá cada decisión de arquitectura en **lenguaje de obra**, no de sistemas
  (ej: "la base de datos de insumos es como tu lista maestra de precios de proveedores").
- **Nunca** dejes un paso que requiera editar archivos a mano, tocar variables de entorno
  o correr comandos que no estén documentados en el README.
- Si algo falla, dale el diagnóstico y el comando exacto a pegar. Nada de "revisá tu entorno".
- Antes de escribir código en una fase nueva, **presentá un plan corto y esperá aprobación**.

---

## 2. Objetivo del sistema

Una aplicación de escritorio-local (corre en la máquina del usuario, se usa desde el navegador)
que reemplace la planilla de cálculo y cubra el ciclo completo:

```
Bases de datos de insumos y precios
        ↓
Análisis de Precio Unitario (APU) por ítem
        ↓
Cómputo y Presupuesto de la obra
        ↓
Resumen de empresa (coeficiente resumen, impuestos, beneficio)
        ↓
Plan de trabajos (Gantt) + Curva de inversión teórica
        ↓
Carga de avances reales → Curva real + desvíos + alertas
        ↓
Certificados de obra y exportación a Excel/PDF
```

El usuario trabaja tanto con licitaciones **públicas** como **privadas**. Esto no cambia
el modelo de cálculo, pero sí impacta en la Fase 8 (carátula y formato de exportación
deben poder adaptarse a los requisitos formales de una licitación pública).

---

## 3. Stack tecnológico (fijo — no cambiar sin autorización explícita)

| Capa | Tecnología | Motivo |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Un solo proceso, un solo comando para arrancar |
| Base de datos | **SQLite** vía **Drizzle ORM** (`better-sqlite3`) | Un único archivo `datos/obra.db`. El usuario lo respalda copiándolo |
| UI | **Tailwind CSS + shadcn/ui** | Componentes de tabla, formulario y diálogo ya resueltos |
| Grillas | **TanStack Table** | Edición tipo planilla, que es el modelo mental del usuario |
| Gráficos | **Recharts** | Curvas S y barras |
| Gantt | Componente propio en SVG/CSS | Los Gantt de terceros son pesados y difíciles de ajustar |
| Exportación | **ExcelJS** (xlsx) y **@react-pdf/renderer** o print CSS (pdf) | Las planillas de licitación se presentan impresas |
| Testing | **Vitest** | Obligatorio en toda la lógica de cálculo |

**Reglas de stack:**
- Todo corre local. Sin nube, sin cuentas, sin login, sin internet.
- Un solo comando de arranque: `npm run dev` → abre en `http://localhost:3000`.
- Nada de Docker, ni Postgres, ni servicios externos.

---

## 4. Principios de diseño no negociables

Estos cinco puntos son el corazón del sistema. Si una decisión los contradice, la decisión está mal.

### 4.1 Receta y precio están separados
Una APU guarda **cantidades y rendimientos**, nunca importes congelados.
El precio se resuelve siempre al momento de calcular, contra la lista de precios vigente
a una **fecha base** definida por la obra. Esto permite reevaluar un presupuesto entero
a precios de hoy cambiando una sola fecha — condición de supervivencia en Argentina.

### 4.2 Historial de precios, no sobreescritura
Actualizar un precio **inserta una fila nueva** con fecha de vigencia. Nunca pisa la anterior.
El precio vigente es el último registro con `fecha_vigencia <= fecha_base_de_la_obra`.

### 4.3 Presupuesto cerrado = foto congelada
Cuando el usuario marca un presupuesto como **"Presentado"**, se guarda un *snapshot*
completo (composición de cada APU + precios usados). Modificar el catálogo después
**no puede alterar** un presupuesto ya presentado. El usuario debe poder ver siempre
con qué números cotizó.

### 4.4 Todo cálculo es trazable
Cualquier número mostrado en pantalla debe poder abrirse y mostrar su desagregado hasta
el insumo. Nada de resultados sin origen visible.

### 4.5 Los datos son sagrados
Ninguna operación borra datos en cascada sin confirmación explícita del usuario.
Borrado lógico (`activo = false`) por defecto. Antes de toda migración de esquema,
copia de respaldo automática de `datos/obra.db`.

---

## 5. Modelo de datos

Nombres en español (el usuario tiene que poder leer la base). Tipos indicativos.

### Catálogo e insumos

```
insumo
  id, codigo, descripcion, unidad, tipo ('material'|'mano_obra'|'equipo'), activo
  -- las categorías de mano de obra (Oficial especializado, Oficial, Medio oficial,
  -- Ayudante, etc.) son insumos tipo 'mano_obra', cada uno con su propio precio
  -- horario e historial, igual que un material

precio_insumo                     -- historial, nunca se pisa
  id, insumo_id, fecha_vigencia, precio, fuente
  -- todos los precios en ARS. No se maneja conversión de moneda (decisión Fase 0:
  -- el usuario no cotiza en dólares)

rubro
  id, codigo, nombre, orden

item_catalogo                      -- el "subrubro" / tarea tipo. La receta maestra
  id, codigo, rubro_id, descripcion, unidad ('m2'|'m3'|'ml'|'u'|'gl'|'kg'),
  origen ('sistema'|'usuario'), activo, creado_en

componente_apu                     -- líneas de la receta
  id, item_catalogo_id, insumo_id, tipo,
  cantidad_unitaria,               -- consumo por unidad de ítem
  desperdicio_pct,                 -- solo materiales
  rendimiento_horas,               -- solo mano de obra y equipos: h por unidad de ítem
  observacion
```

### Parámetros de empresa y obra

```
parametros_empresa                 -- valores por defecto, editables
  gastos_generales_pct, beneficio_pct,
  ingresos_brutos_pct, iva_pct, sellado_pct, gastos_financieros_pct, seguros_pct
  razon_social, cuit, direccion, matricula   -- datos de carátula (Fase 8)
  -- cargas_sociales_pct NO vive acá: se calcula a partir de concepto_carga_social

concepto_carga_social               -- desglose de cargas sociales, editable por concepto
  id, nombre,                       -- ej: "Premio por asistencia", "SAC", "FCL Ley 22.250"
  alicuota_pct,
  base_aplicacion ('salario_basico'|'subtotal_remunerativo'|'base_aportes'|'subtotal_liquidado'),
  orden,                            -- se acumulan en cascada, en este orden
  activo, observacion
  -- el factor de cargas sociales (1 + Σ incidencias) se recalcula solo cuando
  -- cambia una alícuota. Ver 6.1. Reemplaza al viejo cargas_sociales_pct único.

obra
  id, nombre, comitente, ubicacion, fecha_base_precios,
  estado ('borrador'|'presentado'|'en_ejecucion'|'cerrada'),
  tipo_licitacion ('publica'|'privada'),
  anticipo_pct, fondo_reparo_pct,
  -- overrides opcionales de parametros_empresa
```

### Presupuesto

```
presupuesto_item
  id, obra_id, nro_item,           -- jerárquico: "1", "1.1", "1.2"
  rubro_id, item_catalogo_id (nullable si es ítem manual),
  descripcion, unidad, cantidad,   -- cantidad = único dato de carga manual
  orden

apu_snapshot                       -- foto congelada al presentar
  id, presupuesto_item_id, json_composicion, fecha_snapshot, costo_unitario_congelado
```

### Plan y control

```
plan_tarea
  id, obra_id, presupuesto_item_id (o rubro_id para agrupar),
  fecha_inicio, fecha_fin,
  curva ('lineal'|'campana'|'manual'),
  distribucion_manual_json         -- % por período cuando curva='manual'

avance_real
  id, plan_tarea_id, periodo,      -- 'YYYY-MM'
  cantidad_ejecutada, porcentaje_ejecutado, fecha_carga, observacion

certificado
  id, obra_id, numero, periodo, estado,
  monto_bruto, desc_anticipo, desc_fondo_reparo, monto_neto

accion_correctiva                  -- agregada en Fase 7, no estaba prevista acá
  id, obra_id, rubro_id, periodo,  -- período de corte que generó el desvío
  desvio_pesos, desvio_dias,
  accion_decidida, responsable, fecha_revision, creado_en
```

---

## 6. Reglas de cálculo (implementar exactamente así)

Toda esta lógica vive en `/lib/calculo/` como **funciones puras**, separada de la UI,
y **con tests unitarios obligatorios**.

### 6.1 Costo unitario de un ítem (APU)

```
costo_materiales = Σ ( cantidad_unitaria × (1 + desperdicio_pct) × precio_vigente )

costo_mano_obra  = Σ ( rendimiento_horas × precio_horario_categoria × factor_cargas_sociales )

costo_equipos    = Σ ( rendimiento_horas × costo_horario_equipo )
                   -- costo_horario_equipo ya incluye combustible y lubricantes,
                   -- no se desagregan como línea aparte (decisión Fase 0)

COSTO UNITARIO DIRECTO = costo_materiales + costo_mano_obra + costo_equipos
```

`precio_horario_categoria` sale del insumo tipo `mano_obra` correspondiente
(Oficial, Ayudante, etc.), resuelto contra su historial de precios a la fecha base,
igual que un material.

`factor_cargas_sociales` se calcula a partir de `concepto_carga_social` (ver sección 5),
acumulando cada concepto sobre la base que le corresponde, en el `orden` definido:

```
factor_cargas_sociales = 1 + Σ ( alicuota_pct de cada concepto activo,
                                  aplicada en cascada sobre su base_aplicacion )
```

Mostrar siempre el desglose completo (cada concepto con su alícuota e incidencia
sobre el básico), no solo el factor final. Es un dato que el usuario audita seguido
porque cambia con el convenio.

### 6.2 Coeficiente resumen — cascada, con impuestos sumados directo

**Decisión de Fase 0:** a diferencia de una redacción anterior de este documento,
los impuestos sobre facturación (IIBB, sellado) **se suman directo** sobre el
subtotal, igual que en la planilla real de referencia del usuario
(`docs/formato-apu/`). No se despejan dividiendo. Esto es una simplificación
consciente y deliberada: matemáticamente, el % de IIBB que se termina pagando sobre
el precio de venta final queda levemente por debajo del nominal, pero es el criterio
que el usuario usa hoy y con el que audita sus presupuestos.

```
paso 1   subtotal_1  = costo_directo × (1 + gastos_generales_pct)
paso 2   subtotal_2  = subtotal_1   × (1 + beneficio_pct)
paso 3   subtotal_3  = subtotal_2   × (1 + gastos_financieros_pct + seguros_pct)
paso 4   impuestos   = subtotal_3   × (iva_pct + ingresos_brutos_pct + sellado_pct)
paso 5   precio_final = subtotal_3 + impuestos

coeficiente_resumen k = precio_final / costo_directo
```

Mostrar el coeficiente `k` explícito en pantalla, con cada paso desagregado.
Es el número que el usuario controla y discute con el comitente.

### 6.3 Presupuesto

```
precio_total_item = cantidad × precio_unitario_de_venta
subtotal_rubro    = Σ precio_total_item del rubro
incidencia_pct    = precio_total_item / total_presupuesto × 100
```

### 6.4 Curvas de inversión

```
Teórica (contrato):
  para cada plan_tarea, repartir su monto entre fecha_inicio y fecha_fin
  según la curva elegida (lineal / campana beta / manual)
  → monto planificado por período → acumulado = CURVA S TEÓRICA

Real:
  monto_real_periodo = Σ ( cantidad_ejecutada × precio_unitario_de_venta )
  → acumulado = CURVA S REAL

Ambas se grafican superpuestas en un mismo eje.
La curva real solo se dibuja hasta el último período con avances cargados.
```

### 6.5 Detección de desvíos (Valor Ganado simplificado)

```
PV (valor planificado)  = acumulado teórico al período
EV (valor ganado)       = Σ (% avance real × monto contractual del ítem)
AC (costo real)         = opcional, si el usuario carga costos reales

SPI = EV / PV        → < 1 : atrasado
SV  = EV − PV        → desvío en pesos

Semáforo:  SPI ≥ 0.95 verde | 0.85–0.95 amarillo | < 0.85 rojo
```

Cada rubro en rojo genera una fila en el **panel de acciones correctivas**, con:
rubro, desvío en $, desvío en días, y campo libre para la acción decidida por el usuario.

---

## 7. Módulos funcionales

1. **Bases maestras** — ABM de insumos (incluye las categorías de mano de obra como
   insumos con precio horario propio), listas de precios con fecha, rubros, parámetros
   de empresa, y ABM de conceptos de cargas sociales (alícuota + base de aplicación).
2. **Catálogo de ítems (APU tipo)** — recetas reutilizables entre obras.
3. **Obras** — alta, fecha base de precios, parámetros propios, estado.
4. **Cómputo y presupuesto** — grilla editable. El usuario elige rubro → ítem y carga **solo la cantidad**. Nº de ítem, unidad, precio unitario, total, subtotal e incidencia son calculados.
5. **APU en vivo** — al seleccionar un ítem se muestra su análisis desagregado, editable *solo para esta obra* o promovible al catálogo.
6. **Ítem nuevo + guardado en catálogo** — si el ítem no existe, se abre una APU en blanco; terminada la carga, botón **"Guardar en catálogo"** la vuelve reutilizable (`origen='usuario'`).
7. **Resumen de empresa** — costo directo, cargas sociales, seguros, impuestos, beneficio, totales por material / mano de obra / equipos, coeficiente resumen.
8. **Plan de trabajos** — Gantt generado desde los rubros del presupuesto, con fechas editables.
9. **Control de obra** — carga de avances por período, curvas superpuestas, semáforo de desvíos, acciones correctivas.
10. **Certificaciones** — certificado mensual con anticipo y fondo de reparo.
11. **Exportación** — Excel y PDF con formato de planilla de licitación.

---

## 8. Plan de fases

Se desarrolla **una fase por sesión**. No empezar la siguiente sin aprobación del usuario.

| Fase | Contenido | Se prueba con |
|---|---|---|
| 0 | Esqueleto, base de datos vacía, navegación, README | La app abre y navega |
| 1 | Bases maestras + historial de precios | Cargar 20 insumos y actualizar un precio |
| 2 | Catálogo de ítems + motor de cálculo de APU + tests | Un APU real conocido da el número esperado |
| 3 | Obras + presupuesto + incidencias | Cargar un presupuesto chico completo |
| 4 | Resumen de empresa + coeficiente resumen | Verificar el `k` contra una planilla propia |
| 5 | Ítem manual + guardado en catálogo + snapshot al presentar | Crear ítem nuevo y reusarlo en otra obra |
| 6 | Plan de trabajos (Gantt) + curva teórica | Planificar 6 meses y ver la curva |
| 7 | Avances reales + curva real + desvíos + acciones | Cargar 3 meses de avance con atraso |
| 8 | Certificados + exportación Excel/PDF | Emitir un certificado e imprimirlo |
| 9 | *(opcional)* Redeterminación de precios por fórmula polinómica | Recalcular con índices INDEC |

---

## 9. Reglas de trabajo para Claude Code

- **Planificar antes de codear.** Al abrir una fase: plan corto, archivos a tocar, y esperar el OK.
- **Commits chicos y frecuentes.** Uno por unidad de trabajo terminada, mensaje en español, y aviso al usuario de que puede volver atrás.
- **Tests obligatorios** en `/lib/calculo/`. Ninguna fórmula sin test.
- **Datos de ejemplo reales** en `seed/` (rubros y análisis de precios típicos de obra argentina) para que el usuario pueda probar sin cargar todo a mano. Claramente marcados como semilla y borrables.
- **Nada de datos mockeados** dentro de la app. La app lee siempre de la base.
- **Migraciones seguras.** Antes de cambiar el esquema: respaldo automático de `datos/obra.db` en `datos/backups/`.
- **README actualizado** al cerrar cada fase: cómo arrancar, cómo respaldar, qué se puede hacer hoy.
- **Al cerrar una fase**, actualizar la sección "Estado del proyecto" al final de este archivo.
- **Si algo del pedido es ambiguo, preguntar.** Especialmente en criterios de costeo: es preferible una pregunta a un cálculo mal supuesto.
- **No refactorizar de oficio.** Si algo grande hay que reescribir, proponerlo y esperar aprobación.

---

## 10. Estado del proyecto

> Claude Code actualiza esta sección al terminar cada fase.

- **Fase actual:** 9 (opcional, redeterminación de precios) — sin arrancar
- **Fases cerradas:** 0 (esqueleto), 1 (bases maestras), 2 (catálogo y motor
  de cálculo), 3 (obras y presupuesto), 4 (resumen de empresa), 5 (ítem
  manual, guardado en catálogo y snapshot), 6 (plan de trabajos y curva
  teórica), 7 (control de obra, avances reales y desvíos), 8 (certificados
  y exportación)
- **Qué quedó funcionando en la Fase 8:**
  - Certificados (`/certificados`, reemplaza el placeholder): no se carga
    nada a mano. "Generar certificado" toma el mes elegido de una lista de
    meses con avance real cargado en Control de obra (Fase 7) que todavía
    no tienen certificado, y usa el monto de esa curva real como bruto del
    período — es el mismo número que ya calculaba la Fase 7, sin ninguna
    fórmula de costeo nueva (`lib/acciones/certificados.ts`).
  - Descuento de anticipo financiero y fondo de reparo según los % de la
    obra, acumulado bruto anterior/actual, numeración correlativa (nunca
    reutiliza un número aunque se borre un borrador intermedio) y estados
    borrador → emitido → aprobado, solo hacia adelante
    (`lib/calculo/certificados.ts`, con tests). Un certificado solo se
    puede borrar en borrador.
  - Datos de carátula nuevos en Bases maestras → Parámetros de empresa
    (razón social, CUIT, dirección, matrícula) — no estaban en el modelo de
    datos original, se agregaron 4 columnas a `parametros_empresa` con
    respaldo previo de la base.
  - Impresión a PDF vía **print CSS**, no una librería nueva (decisión
    tomada con el usuario: `@react-pdf/renderer` quedó descartado por
    ahora). Tres pantallas de impresión, cada una con la misma carátula
    (`components/impresion/caratula.tsx`) y un botón que llama a
    `window.print()` (`components/impresion/boton-imprimir.tsx`):
    - `/imprimir/presupuesto/[obraId]` — cómputo y presupuesto completo,
      con el mismo formato jerárquico rubro/ítem de
      `docs/formato-apu/Planilla de computo y presupuesto.pdf`.
    - `/imprimir/apu/[itemId]` — análisis de precio unitario de una línea
      del presupuesto, replicando el formato de
      `docs/formato-apu/Planilla de analisis de precio .jpg` (materiales,
      mano de obra con cargas sociales desagregadas aparte, equipos,
      combustibles y lubricantes en $0 por la decisión de Fase 0, costo
      directo, cascada del coeficiente resumen). Usa
      `obtenerApuResueltoDePresupuestoItem` (`lib/acciones/presupuesto.ts`,
      nueva), que resuelve congelado-o-en-vivo con el mismo criterio que
      `listarPresupuesto`.
    - `/imprimir/certificado/[certificadoId]` — el certificado con
      acumulados y renglones de firma para comitente y contratista.
    - El sidebar y el toaster se esconden solo al imprimir (clase
      `.no-imprimir` + `@media print` en `app/globals.css`), no en
      pantalla — así se puede seguir navegando desde la misma página.
  - Exportación a Excel con ExcelJS (`lib/exportacion/excel.ts` +
    `app/api/exportar/[obraId]/route.ts`, botón "Exportar a Excel" en
    Obras y presupuesto): un libro por obra con 4 hojas — Presupuesto,
    APUs (todas seguidas, una por ítem), Plan de trabajos (grilla rubro ×
    mes con el monto de cada uno, reutilizando `construirTareasDelPlan` +
    `calcularCurvaTeorica`) y Curva de inversión (tabla de período/monto/
    acumulado). ExcelJS no genera gráficos nativos de Excel: la curva va
    como tabla de datos, no como imagen — el usuario la grafica con un
    clic si quiere el dibujo.
  - Probado a mano de punta a punta en `/obras/1` ("Casa de prueba"):
    imprimir presupuesto y una APU (verificado que el precio final de la
    APU impresa, $41.881,06, coincide centavo a centavo con el precio
    unitario del presupuesto), generar el certificado de 2026-09 (bruto
    $837.621,19 — el mismo monto que ya mostraba Control de obra),
    avanzarlo a "Emitido", imprimirlo, y descargar el Excel (verificado
    que las 4 hojas traen los números correctos y consistentes entre sí).
- **Decisión tomada en la Fase 8:** el pedido original preveía "@react-pdf/
  renderer o print CSS" para el PDF; se eligió print CSS porque no agrega
  dependencias y encaja con una app 100% local. Si más adelante hace falta
  un botón de "Descargar PDF" sin pasar por el diálogo de impresión del
  navegador, hay que instalar `@react-pdf/renderer`.
- **Qué quedó funcionando en la Fase 7:**
  - Control de obra (`/control-obra`, reemplaza el placeholder): un
    selector de obra y, debajo, el mismo plan de la Fase 6 pero con dos
    barras por tarea (`components/control-obra/gantt-control.tsx`, de solo
    lectura): la de contrato (gris) y, superpuesta y más angosta, la
    ejecutada, coloreada según el semáforo del rubro. El % ejecutado de una
    barra es la suma de sus avances mensuales cargados.
  - El avance siempre se carga en mes calendario (`avance_real.periodo`,
    'YYYY-MM'), sea cual sea la escala mensual/semanal que se esté mirando
    en Plan de trabajos — es independiente de esa vista. Un avance es "lo
    que se hizo ese mes", no un acumulado: el sistema va sumando mes a mes.
  - Ficha de carga de avance por tarea (`components/control-obra/avance-sheet.tsx`,
    botón "Cargar avance" en cada fila del Gantt): si la barra es de un
    ítem del presupuesto, cargás cantidad ejecutada en su unidad o el
    porcentaje y el sistema calcula el otro (con vista previa en vivo,
    `cargarAvancePeriodo` en `lib/acciones/control-obra.ts`); si la barra
    es de un rubro completo (agrupa ítems de distinta unidad, no tiene una
    cantidad física única), solo se carga el porcentaje. Debajo, la lista
    de meses ya cargados con opción de borrar cada uno.
  - Curva real acumulada superpuesta a la teórica en el mismo gráfico
    (`components/control-obra/curva-comparada-chart.tsx`), cortada sola al
    último mes con datos — no hace falta ninguna lógica para el corte:
    `calcularCurvaReal` (`lib/calculo/valor-ganado.ts`) solo emite los
    períodos que tienen avance, y el gráfico no dibuja el tramo sin datos.
  - Valor ganado según CLAUDE.md 6.5, con dos decisiones que no estaban
    cerradas ahí: el "período de corte" (donde se miden PV/EV/SPI/SV) es el
    último mes con algún avance cargado en la obra; y el desvío en días se
    calcula buscando en la curva teórica en qué fecha se iba a alcanzar el
    mismo monto acumulado que el EV real (interpolando dentro del mes) y
    comparando con la fecha de corte real — positivo es atraso
    (`calcularDesviosPorRubro`, con tests). Se calcula por rubro, agrupando
    tanto la barra del rubro como las de sus ítems desagregados.
  - Semáforo por rubro (`components/control-obra/semaforo-rubros-table.tsx`)
    con el mismo corte de CLAUDE.md 6.5 (SPI ≥ 0,95 verde, 0,85–0,95
    amarillo, menos rojo). Un rubro sin PV todavía (su tarea arranca después
    del corte) se muestra verde — no hay con qué compararlo todavía.
  - Panel de acciones correctivas (`components/control-obra/acciones-correctivas-panel.tsx`):
    cada rubro que cae en rojo genera y actualiza sola su fila (tabla nueva
    `accion_correctiva`, no estaba en el modelo de datos original — ver
    sección 5) con el desvío en $ y en días; el arquitecto completa acción
    decidida, responsable y fecha de revisión (`guardarAccionCorrectiva`,
    upsert por obra+rubro para no depender de que la fila automática ya
    exista). Si un rubro deja de estar en rojo, su fila se saca de la lista
    de pendientes pero **no se borra** si ya tiene algo escrito — se
    recupera sola si el rubro vuelve a atrasarse (CLAUDE.md 4.5: los datos
    son sagrados). Probado a mano: cargado un avance atrasado, apareció la
    fila roja; completada la acción y guardada; borrado el avance para
    simular que nunca se había cargado, la fila con el texto ya escrito
    volvió a aparecer sola.
  - Motor puro en `lib/calculo/valor-ganado.ts` (10 tests): `calcularSemaforo`,
    `calcularCurvaReal` y `calcularDesviosPorRubro`.
  - Se extrajo `construirTareasDelPlan` de `lib/acciones/plan-trabajos.ts` a
    `lib/acciones/plan-trabajos-helpers.ts` (sin `"use server"`) para poder
    reutilizarla desde control de obra — Next.js exige que todo lo
    exportado de un archivo `"use server"` sea `async`, y esta es una
    función pura.
  - Probado a mano en `/obras/1` ("Casa de prueba"): cargado un avance de
    septiembre en el ítem de mampostería (20 de 25 m², 80%), el rubro dio
    atrasado (SPI 0,80, `-$209.405,30`, `+6` días) porque su tarea ya había
    terminado a la fecha de corte; cargado un segundo mes con el resto
    (100%), volvió a "Al día" (SPI 1,00) y la curva real quedó pegada a la
    teórica hasta ese mes. Los datos sobrevivieron a un reinicio del
    servidor.
- **Qué quedó funcionando en la Fase 6:**
  - Plan de trabajos (`/plan-trabajos`) con un Gantt propio en SVG/CSS
    (`components/plan-trabajos/gantt-chart.tsx`) — sin librerías de
    terceros, tal como pide CLAUDE.md sección 3. Cada rubro del presupuesto
    es una fila con su barra; arrastrando el cuerpo se mueve, arrastrando
    los bordes se estira. No hay drag/resize de terceros: son mouse events
    nativos (mousedown/mousemove/mouseup en `window`).
  - "Generar / completar plan": crea una tarea de 30 días por cada rubro que
    todavía no tenga una, una atrás de la otra a partir de una fecha que
    elige el usuario. Es idempotente — llamarlo de nuevo (por ejemplo si se
    agrega un rubro al presupuesto más adelante) solo completa lo que falta,
    sin tocar lo ya planificado (`generarPlanInicial`,
    `lib/acciones/plan-trabajos.ts`).
  - Desplegar un rubro muestra sus ítems, cada uno con un botón
    "+ Planificar ítem" para darle su propia barra. La barra del rubro
    representa siempre "subtotal del rubro menos lo ya desagregado a nivel
    ítem" (`montoNetoRubro`, `lib/calculo/curva-inversion.ts`, con test) —
    así el total nunca se duplica ni se pierde sin importar cuánto se
    desagregue. Probado a mano: al planificar el único ítem de un rubro, la
    barra del rubro pasó a $0,00 sola.
  - Panel lateral por tarea (`components/plan-trabajos/tarea-sheet.tsx`)
    para editar fechas a mano y elegir cómo se reparte el monto en el
    tiempo: lineal (proporcional a los días en cada período), campana
    (peso `sin(pi·t)` sobre la duración, pico en el medio) o manual (%
    por período cargado a mano, validado que sume 100%). Estas dos
    fórmulas de reparto no estaban cerradas en CLAUDE.md 6.4 — se
    definieron en esta fase (`lib/calculo/curva-inversion.ts`, con tests).
  - Curva de inversión teórica acumulada (Recharts, mismo patrón que la
    torta de la Fase 4) y tabla de certificación proyectada mes a mes
    (o semana a semana) debajo del Gantt, con el mismo cálculo puro
    (`calcularCurvaTeorica`).
  - Escala mensual por defecto, con toggle a semanal — la semana es "Sem N"
    contada desde el inicio del rango visible del Gantt (no semana ISO,
    para no complicar la lectura); la curva de abajo sí usa semana ISO real
    (`YYYY-Www`) para los períodos, son ejes independientes.
  - **Bug encontrado y corregido durante la prueba en navegador:** al
    arrastrar una barra, React tiraba "Cannot update a component (Router)
    while rendering a different component (GanttChart)" y el movimiento no
    se guardaba. Causa: se llamaba a los callbacks `onMoverTarea`/
    `onClickTarea` (que terminan en `router.refresh()`) desde *adentro* del
    updater de `setArrastre(prev => ...)` — no está permitido tener efectos
    secundarios ahí. Se corrigió sacando esos llamados afuera del updater y
    usando un `ref` (no el estado `overrides`, que quedaba con un valor
    viejo por el cierre del efecto) para leer la posición final del
    arrastre al soltar el mouse.
  - No se agregó ninguna fecha de inicio/fin a la tabla `obra` — el plan de
    trabajos no la necesita, alcanza con pedir la fecha una vez al generar
    las primeras tareas.
- **Qué quedó funcionando en la Fase 5:**
  - "Ítem nuevo" en el presupuesto (`components/obras/agregar-item-dialog.tsx`,
    pestañas "Del catálogo" / "Ítem nuevo"): elegís rubro de tu lista
    existente (no texto libre — así no se rompe la agrupación por rubro del
    resumen y el futuro Gantt), escribís descripción y unidad, y cargás
    cantidad. Se crea la línea del presupuesto sin ítem de catálogo detrás
    (`agregarItemManualPresupuesto`, `lib/acciones/presupuesto.ts`).
  - Receta "suelta" por obra: mientras no la guardás en el catálogo, los
    materiales/mano de obra/equipos que cargás en el panel lateral
    (`components/obras/presupuesto-apu-sheet.tsx`, modo editable) viven en
    una tabla nueva, `componente_presupuesto_item` — no tocan tu catálogo
    maestro hasta que decidís lo contrario. El cálculo reutiliza el mismo
    motor de la Fase 2 (`calcularApuDesdeComponentes`, extraído de
    `calcularApuDeItem` en `lib/acciones/catalogo.ts` para poder alimentarlo
    también desde esta tabla nueva).
  - Botón "Guardar en catálogo": crea el ítem de catálogo (`origen='usuario'`)
    con la receta cargada y engancha la línea del presupuesto a ese ítem
    nuevo — de ahí en más se comporta como cualquier ítem de catálogo, en
    esta obra y en las que vengan (`promoverItemManualACatalogo`).
  - Aviso de ítem parecido antes de guardar: compara tu descripción
    (`lib/calculo/similitud.ts`, con tests) contra los ítems de catálogo del
    mismo rubro, ignorando tildes/mayúsculas/espacios de más. Si encuentra
    coincidencia te deja elegir "Usar este" (engancha tu línea al ítem
    existente y descarta la receta suelta, `usarItemCatalogoExistente`) o
    guardar igual como nuevo. Probado a mano con "Mampostería de ladrillo
    hueco 12 cm" repetido a propósito: lo detectó y "Usar este" funcionó.
  - Snapshot al marcar una obra como "Presentada" (`presentarObra`,
    `lib/acciones/obras.ts` ya no hace el cambio de estado sola — el botón
    de la pantalla de presupuesto llama a `presentarObra` cuando el estado
    elegido es "presentado"): recorre cada línea del presupuesto, calcula su
    APU a la fecha base vigente en ese momento (para ítems de catálogo o
    manuales, con o sin snapshot previo) y lo congela en `apu_snapshot`
    (línea por línea, con el precio unitario final). Si la obra se vuelve a
    presentar más adelante, se regenera con los valores de ese momento.
  - Una vez que una línea tiene snapshot, `listarPresupuesto` siempre
    muestra esos valores congelados (badge "Congelado" en la grilla y en el
    panel lateral) — cambiar el catálogo o actualizar precios después no la
    altera, sin importar si la obra vuelve a estado "Borrador". Probado a
    mano: presenté la obra de ejemplo, los dos ítems quedaron marcados
    "Congelado" con el desglose completo visible en modo solo-lectura
    ("Presentado el [fecha]").
  - Verificado a mano el flujo completo en `/obras/1` ("Casa de prueba"):
    ítem nuevo → carga de un material → "Guardar en catálogo" (sin
    parecidos, rubro nuevo) → presentar obra → congelado. Y por separado,
    con un segundo ítem manual duplicado a propósito en el rubro
    Mampostería: el aviso de parecido apareció y "Usar este" enganchó
    correctamente al ítem existente.
- **Decisión tomada en la Fase 5:** el pedido original decía "escribir
  libremente rubro" para el ítem nuevo; se implementó con el selector de
  rubro existente en vez de texto libre, porque el modelo de datos usa
  `rubro_id` como FK (necesario para que las incidencias por rubro y, más
  adelante, el Gantt agrupado por rubro sigan funcionando). Si falta un
  rubro se agrega una vez en Bases maestras.
- **Qué quedó funcionando en la Fase 4:**
  - Hoja de resumen de empresa (`/resumen-empresa`,
    `lib/acciones/resumen-empresa.ts`) que consolida el presupuesto de una
    obra elegida: costo directo, aporte de cargas sociales (desagregado
    dividiendo el costo de mano de obra por el factor), y totales de
    materiales/mano de obra/equipos con incidencia % y gráfico de torta
    (Recharts, recién instalado).
  - Cascada del coeficiente resumen desagregada en 7 líneas (gastos
    generales, beneficio, seguros, gastos financieros, IVA, IIBB, sellado)
    en `lib/calculo/resumen-empresa.ts` — son los mismos subtotales que ya
    calculaba `calcularCoeficienteResumen` (Fase 2), solo más desglosados
    para mostrar, sin fórmulas nuevas.
  - Edición de porcentajes en vivo, 100% en el navegador: las funciones de
    `lib/calculo/` son puras, así que tantear un escenario no pega al
    servidor ni guarda nada hasta que el usuario aprieta "Guardar como
    parámetros de empresa" (reutiliza `guardarParametrosEmpresa`, Fase 1).
  - Modo "objetivo de precio" (`resolverBeneficioParaPrecioObjetivo`):
    despeja el % de beneficio necesario para un precio final dado. Probado
    a mano: con costo directo $625.831,95 y precio objetivo $1.200.000,
    devolvió 28,36% de beneficio, y al recalcular con ese valor el precio
    final dio exactamente $1.200.000,00.
  - Verificado a mano que el precio final agregado de esta pantalla
    coincide centavo a centavo con la suma de los precios unitarios del
    presupuesto de la Fase 3 (ambos dan $1.047.026,49 con los parámetros
    por defecto) — confirma que agregar antes o después de aplicar la
    cascada da lo mismo, como corresponde matemáticamente.
- **Qué quedó funcionando en la Fase 3:**
  - Alta y edición de obras (`lib/acciones/obras.ts`): fecha base de precios,
    tipo de licitación, anticipo, fondo de reparo, estado.
  - Presupuesto tipo planilla (`/obras/[id]`, `lib/acciones/presupuesto.ts`):
    rubro → ítem del catálogo (listas dependientes) → cantidad; todo lo demás
    se calcula. El precio unitario es el precio de venta que sale del motor
    de la Fase 2 (`calcularApuDeItem`), a la fecha base de la obra — no hay
    fórmula de costeo nueva acá, solo orquestación.
  - Numeración jerárquica ("1", "1.1", "1.2") y subtotales/incidencias en
    `lib/calculo/presupuesto.ts` (funciones puras, con tests), recalculadas
    solas después de cada alta, baja o reordenamiento.
  - Reordenar ítems dentro de un mismo rubro arrastrando (drag and drop
    nativo de HTML5, sin librería nueva). Probado a mano por el usuario:
    confirmado que funciona bien.
  - Panel de APU reutilizado tal cual de la Fase 2 (`ApuDesglose`) para ver
    el desglose completo de cualquier ítem del presupuesto.
  - Cambiar la fecha base de precios de la obra recalcula todo en vivo —
    verificado a mano: al mover la fecha base más allá de un precio nuevo
    cargado en Bases maestras, el presupuesto entero se actualizó solo.
  - El estado "Presentado" todavía no congela nada (eso es la Fase 5); la
    pantalla lo aclara.
  - Obra de ejemplo dejada en la base ("Casa de prueba") con la mampostería
    cargada, para que la explores — borrable, no es dato real.
- **Qué quedó funcionando en la Fase 2:**
  - ABM del catálogo de ítems (`lib/acciones/catalogo.ts`) con su receta de
    materiales, mano de obra y equipos (`componente_apu` se edita y se borra de
    verdad — no es un ledger, a diferencia del historial de precios).
  - Motor de cálculo puro en `lib/calculo/` (con 19 tests entre las 4 fórmulas):
    `cargas-sociales.ts` (cascada del factor, con la regla acordada: cada
    concepto se aplica sobre el acumulado, salvo `salario_basico` que siempre
    parte del básico original), `apu.ts` (costo unitario directo, marca con
    error la línea de un insumo sin precio vigente en vez de calcular mal) y
    `coeficiente-resumen.ts` (cascada de gastos generales → beneficio →
    financieros/seguros → impuestos sumados directo → precio final).
  - Pantalla de APU (`/catalogo`) con selector de fecha de cálculo y el
    desglose completo visible paso a paso, tal como pide CLAUDE.md 4.4.
  - Ítem de catálogo de ejemplo en el seed: mampostería de ladrillo hueco
    12 cm, con receta completa — usalo para verificar el motor contra tu
    propia planilla.
  - **Corrección sobre el prompt guardado de la Fase 2:** el prompt decía que
    los impuestos "se despejan dividiendo"; eso quedó desactualizado — la
    decisión vigente (sección 6.2, confirmada en Fase 0) es que se suman
    directo. Se implementó así.
- **Qué quedó funcionando en la Fase 1:**
  - ABM de insumos (materiales, mano de obra, equipos) con historial de precios:
    actualizar un precio siempre inserta una fila nueva, nunca pisa la anterior.
  - Actualización de precios en lote (varios insumos + % + fecha, en una operación).
  - Importación de listas de proveedor en `.xlsx`, con mapeo de columnas y vista
    previa antes de confirmar.
  - ABM de rubros (se le agregó `activo` al esquema para borrado lógico) y de
    conceptos de cargas sociales.
  - Parámetros generales de empresa (gastos generales, beneficio, IVA, IIBB,
    sellado, financieros, seguros).
  - Función pura `obtenerPrecioVigente` en `lib/calculo/precios.ts` (con tests),
    que la Fase 2 reutiliza para resolver precios contra la fecha base de la obra.
  - Datos de ejemplo en `seed/` (10 rubros, 25 insumos típicos de obra argentina).
- **Decisión tomada en la Fase 2:** la cascada del factor de cargas sociales
  (sección 6.1) no tenía un algoritmo cerrado para las 4 bases. Se definió:
  cada concepto se aplica sobre el total acumulado hasta el paso anterior, en
  el orden dado, salvo los conceptos con base `salario_basico`, que siempre
  se calculan sobre el sueldo básico original. El usuario pidió usar este
  criterio estándar y auditarlo después contra su planilla real — todavía no
  está confirmado contra un caso real.
- **Decisiones tomadas en el arranque (Fase 0):**
  - Impuestos sobre facturación (IIBB, sellado): se suman directo, no se despejan
    dividiendo (sección 6.2).
  - Cargas sociales: desglose completo por concepto (tabla `concepto_carga_social`),
    no un % único (secciones 5 y 6.1).
  - Mano de obra: por categoría, cada una como insumo con precio horario propio
    (Oficial especializado / Oficial / Medio oficial / Ayudante).
  - Desperdicio de materiales: % editable por insumo en la receta (ya estaba así).
  - Moneda: todo en pesos, sin manejo de dólares en el MVP.
  - Licitaciones: el usuario trabaja con públicas y privadas (`obra.tipo_licitacion`).
  - Combustibles y lubricantes: incluidos en el costo horario del equipo, sin línea
    separada.
- **Decisiones abiertas:**
  - El factor de cargas sociales (cascada simple, ver Fase 2 arriba) todavía
    no se auditó contra la planilla real del usuario. Cuando lo compare,
    ajustar `lib/calculo/cargas-sociales.ts` si el criterio de su convenio
    difiere.
- **Deuda técnica conocida:** ninguna
