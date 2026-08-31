# Prompts por fase — para copiar y pegar en Claude Code

**Cómo se usa este archivo:** una fase por sesión. Abrís Claude Code, pegás el prompt
de la fase, aprobás el plan, y al terminar cerrás la sesión. Al día siguiente, `/clear`
y la fase siguiente. No mezcles dos fases en una misma conversación: es la causa número
uno de que las cosas se rompan.

---

## Paso previo (una sola vez, antes de todo)

En tu computadora, creá una carpeta para el proyecto y poné adentro:

```
programa-obra/
├── CLAUDE.md                     ← el archivo que te generé
└── docs/
    └── formato-apu.pdf           ← tu documento con el formato exacto de la planilla APU
```

Después abrís la terminal en esa carpeta y ejecutás `claude`.

---

## PROMPT 0 — Arranque del proyecto

```
Leé CLAUDE.md completo antes de responder. Es la especificación del proyecto y la
fuente de verdad; consultalo en cada sesión.

En docs/formato-apu.pdf está el formato exacto que deben tener mis planillas de
Análisis de Precios Unitarios. Analizalo con detalle: la app tiene que poder generar
e imprimir planillas con esa estructura exacta.

Antes de escribir una sola línea de código quiero tres cosas:

1. Un resumen en lenguaje llano (para arquitecto, no para programador) de cómo va a
   funcionar el sistema y qué va a poder hacer cuando esté terminado.

2. Todas las preguntas que necesites hacerme sobre criterios de costeo y de obra.
   Preguntame las que realmente cambian el diseño, no las de detalle. Puntualmente
   quiero que me preguntes sobre: cómo trato hoy las cargas sociales, si trabajo con
   jornal horario o mensual, cómo cargo el desperdicio de materiales, si necesito
   manejar precios en dólares, y si mis presupuestos son para licitación pública,
   privada o ambas.

3. Cuando conteste, el plan de la Fase 0: qué archivos vas a crear y por qué.

No arranques la Fase 0 hasta que yo apruebe explícitamente el plan.

Contexto sobre mí: soy arquitecto, este es mi primer proyecto de desarrollo. Explicame
todo con analogías de obra. Si algo requiere que yo toque un archivo o corra un comando,
dame el texto exacto para pegar.
```

---

## PROMPT 1 — Bases maestras

```
Fase 1: bases de datos maestras.

Implementá el ABM completo de insumos (materiales, mano de obra, equipos), rubros,
listas de precios con historial y parámetros de empresa, según CLAUDE.md.

Puntos críticos:
- Actualizar un precio inserta una fila nueva con fecha de vigencia. Nunca pisa la anterior.
- Tiene que haber una pantalla que me muestre la evolución del precio de un insumo en
  el tiempo, como una lista.
- Necesito poder actualizar precios en lote: seleccionar varios insumos y aplicar un
  porcentaje de aumento con una fecha, en una sola operación.
- Importación desde Excel: una pantalla donde arrastro un .xlsx con mi lista de
  proveedor y mapeo columnas. Que me muestre una vista previa antes de confirmar.

Cargá también datos de ejemplo en seed/ con rubros e insumos típicos de obra argentina,
para que pueda probar sin cargar todo a mano.

Primero el plan, después el código.
```

---

## PROMPT 2 — Motor de cálculo de APU

```
Fase 2: catálogo de ítems y motor de cálculo de APU.

Esta es la fase más importante del sistema. La lógica de cálculo va en /lib/calculo/
como funciones puras, separada de la interfaz, y con tests de Vitest obligatorios.

Implementá exactamente las fórmulas de la sección 6 de CLAUDE.md, prestando especial
atención a la 6.2: el coeficiente resumen se aplica en cascada y los impuestos sobre
facturación se despejan dividiendo, no se suman.

Necesito:
- ABM del catálogo de ítems con su receta (componentes de APU).
- Cálculo del costo unitario resuelto contra la lista de precios vigente a una fecha.
- Una pantalla de APU que muestre el desagregado completo: materiales, mano de obra,
  equipos, subtotales, y el precio de venta con cada paso del coeficiente visible.
- Tests que cubran: desperdicio de materiales, cargas sociales sobre mano de obra,
  y el coeficiente resumen paso por paso.

Cuando termines, mostrame en pantalla un ejemplo completo (por ejemplo mampostería de
ladrillo hueco 12 cm por m²) para que yo verifique el número contra mi planilla actual.

Primero el plan, después el código.
```

---

## PROMPT 3 — Presupuesto

```
Fase 3: obras y presupuesto.

Alta de obras con fecha base de precios, parámetros propios y estado.

La pantalla de presupuesto tiene que sentirse como una planilla de cálculo:
- Elijo rubro, después ítem (listas dependientes: el segundo desplegable se filtra
  por el primero).
- Cargo únicamente la cantidad. Todo lo demás se calcula: número de ítem jerárquico
  (1, 1.1, 1.2), unidad, precio unitario, precio total, subtotal por rubro e incidencia
  porcentual.
- Puedo reordenar ítems arrastrando.
- Puedo abrir la APU de cualquier ítem desde la grilla, en un panel lateral.
- Fila de totales fija abajo, siempre visible.
- Cambiar la fecha base de precios de la obra recalcula todo el presupuesto.

Primero el plan, después el código.
```

---

## PROMPT 4 — Resumen de empresa

```
Fase 4: hoja de resumen para análisis de la empresa.

Una pantalla que consolide el presupuesto y calcule automáticamente:
costo directo, aporte por cargas sociales, gastos por seguros, gastos generales,
beneficio, impuestos (IIBB, sellado, IVA), y los totales separados de mano de obra,
materiales y equipos con su incidencia porcentual sobre el total.

Requisitos:
- El coeficiente resumen tiene que mostrarse desagregado paso por paso, no como un
  número mágico.
- Los porcentajes tienen que ser editables en pantalla y recalcular en vivo, para que
  yo pueda tantear escenarios.
- Quiero un modo "objetivo de precio": yo ingreso el monto al que necesito llegar y el
  sistema me dice qué beneficio me queda.
- Un gráfico de torta con la composición mano de obra / materiales / equipos.

Primero el plan, después el código.
```

---

## PROMPT 5 — Ítem manual y guardado en catálogo

```
Fase 5: carga manual de ítems nuevos y guardado en catálogo. Es la función clave.

Flujo:
1. En el presupuesto, además de los ítems del catálogo, puedo elegir "Ítem nuevo" y
   escribir libremente rubro, descripción y unidad.
2. Se abre una APU en blanco donde cargo a mano los materiales, la mano de obra con sus
   rendimientos y los equipos, eligiendo insumos de la base maestra.
3. Un botón "Guardar en catálogo" captura esa receta y la guarda como ítem reutilizable
   (origen='usuario'), disponible para futuras obras.
4. Al guardar tiene que avisarme si ya existe un ítem parecido, para no duplicar.

Implementá también el snapshot: cuando marco una obra como "Presentada", se congela la
composición completa de cada APU con los precios usados. Después de eso, cambiar el
catálogo no puede alterar ese presupuesto. Quiero poder ver siempre con qué números coticé.

Primero el plan, después el código.
```

---

## PROMPT 6 — Plan de trabajos y curva teórica

```
Fase 6: plan de trabajos (Gantt) y curva de inversión teórica.

- El Gantt se genera leyendo los rubros del presupuesto. Cada rubro arranca como una
  barra que puedo mover y estirar con el mouse, o editar por fechas.
- Puedo desplegar un rubro para planificar sus ítems por separado.
- Para cada tarea elijo cómo se reparte el monto en el tiempo: lineal, campana, o manual
  cargando el porcentaje de cada mes.
- Debajo del Gantt, la curva de inversión teórica acumulada, mes a mes, en pesos y en
  porcentaje.
- Una tabla de certificación proyectada: cuánto se certifica cada mes.

Escala mensual por defecto, con opción semanal. Primero el plan, después el código.
```

---

## PROMPT 7 — Control de obra

```
Fase 7: control de obra, avances reales y desvíos.

- Pantalla de carga de avances por período: para cada ítem cargo cantidad ejecutada o
  porcentaje, y el sistema calcula el otro.
- El Gantt pasa a mostrar dos barras por tarea: contrato y real.
- La curva de inversión real se superpone a la teórica en el mismo gráfico, dibujada
  solo hasta el último mes con datos cargados.
- Cálculo de desvíos con valor ganado según la sección 6.5 de CLAUDE.md: PV, EV, SPI, SV.
- Semáforo por rubro.
- Panel de acciones correctivas: cada rubro en rojo genera automáticamente una fila con
  el desvío en pesos y en días, y un campo donde yo escribo la acción decidida, con
  responsable y fecha de revisión.

Primero el plan, después el código.
```

---

## PROMPT 8 — Certificados y exportación

```
Fase 8: certificaciones y exportación.

Certificados:
- Certificado mensual generado desde los avances cargados del período.
- Descuento de anticipo financiero y fondo de reparo según los porcentajes de la obra.
- Acumulados: certificado anterior, del período, y acumulado a la fecha.
- Numeración correlativa y estados (borrador / emitido / aprobado).

Exportación:
- A Excel: presupuesto, APUs, plan de trabajos y curvas, cada uno en su hoja, con
  formato de planilla de licitación.
- A PDF: presupuesto, APUs individuales y certificados, listos para imprimir y firmar,
  respetando el formato de docs/formato-apu.pdf.
- Carátula configurable con mis datos y los de la obra.

Primero el plan, después el código.
```

---

## Prompts sueltos que vas a necesitar seguido

**Cuando algo no funciona:**
```
Encontré un problema. En la pantalla [cuál], hice [qué hice], esperaba que pasara
[qué esperabas] y en cambio pasó [qué pasó realmente].
Diagnosticá primero la causa y explicámela antes de tocar nada.
```

**Cuando un número no cierra:**
```
El [nombre del número] me da [valor que muestra la app] y según mi planilla debería
dar [valor correcto].
Mostrame el cálculo paso a paso con los valores intermedios reales, para que yo
identifique en qué paso se separa de mi criterio.
```

**Al cerrar una sesión:**
```
Cerramos por hoy. Hacé tres cosas:
1. Commit de todo lo que está terminado y funcionando.
2. Actualizá la sección "Estado del proyecto" de CLAUDE.md.
3. Escribime en dos párrafos, en lenguaje llano, qué quedó funcionando y qué sigue
   la próxima vez.
```

**Cuando querés entender algo sin que toque el código:**
```
No cambies nada todavía. Explicame en lenguaje de obra cómo funciona [lo que sea]
y por qué está hecho así.
```

**Cuando se está yendo de tema:**
```
Pará. Eso no es parte de la fase actual. Anotalo como pendiente en CLAUDE.md y volvé
a lo que estábamos haciendo.
```
