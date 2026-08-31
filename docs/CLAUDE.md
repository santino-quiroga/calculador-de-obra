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

- **Fase actual:** 0 — en curso
- **Fases cerradas:** ninguna
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
- **Decisiones abiertas:** ninguna
- **Deuda técnica conocida:** ninguna
