# Guía de gestión del proyecto

**Para vos, no para Claude.** Esta guía no se le pasa a Claude Code: es tu manual de
dirección de obra del proyecto de software.

---

## 1. La analogía que te va a servir para todo

Un proyecto de software se parece bastante a una obra, y esa analogía aguanta bien:

| En obra | Acá |
|---|---|
| Pliego y memoria descriptiva | `CLAUDE.md` |
| Cómputo y plan de trabajos | El plan de fases (0 a 9) |
| El contratista | Claude Code |
| Vos | Dirección de obra y comitente |
| Certificación mensual | Cada `commit` |
| Recepción provisoria de un rubro | Aprobar una fase después de probarla |
| Libro de obra | El historial de git |
| Tu hijo ingeniero | El asesor estructural: lo llamás para lo puntual |

La consecuencia práctica más importante de esa analogía: **el contratista no puede
adivinar el pliego**. El 90% de los problemas en vibe coding vienen de que la persona
pidió algo vago y aceptó lo primero que salió. Vos ya tenés ventaja acá, porque como
arquitecto estás entrenado en escribir pliegos y en no recibir un rubro sin inspeccionarlo.

---

## 2. Las cinco piezas que tenés que entender (y ninguna más)

No necesitás saber programar. Necesitás saber qué es cada una de estas cinco cosas.

**La carpeta del proyecto.** Todo el programa vive en una carpeta en tu computadora.
Adentro hay muchos archivos, pero vos vas a tocar dos: `CLAUDE.md` (el pliego) y
`datos/obra.db` (todos tus datos, en un solo archivo).

**La terminal.** Esa ventana negra con texto. Es simplemente otra forma de darle órdenes
a la computadora, escribiendo en lugar de haciendo clic. Vas a usar tres comandos en total.

**Claude Code.** Se abre escribiendo `claude` en la terminal, parado en la carpeta del
proyecto. A diferencia del chat, este Claude **lee y escribe los archivos directamente**.
No te devuelve código para que copies: lo crea, lo prueba y lo corrige él.

**Git.** El sistema de versiones. Pensalo como una fotocopiadora que saca una copia
sellada y fechada de toda la obra cada vez que se termina algo. Si mañana algo se rompe,
volvés a la copia de ayer. **Esta es tu red de seguridad y es la razón por la que podés
experimentar sin miedo.** No tenés que aprenderlo: le pedís a Claude "hacé un commit" y listo.

**La base de datos.** Un único archivo, `datos/obra.db`, donde está todo: insumos,
precios, presupuestos, avances. Para respaldarlo lo copiás a otra carpeta, igual que
harías con un `.xlsx`.

---

## 3. Por qué te cambié Excel por una aplicación

Tu prompt original pedía macros de VBA o Apps Script. Te lo cambié y te debo la explicación,
porque es la decisión más grande de todo esto y tenés derecho a discutirla.

**El problema con la planilla:** VBA no se puede testear automáticamente, no se versiona
(no hay "volver a ayer"), y todo vive dentro de un `.xlsm` que a partir de cierta
complejidad se corrompe y se vuelve lentísimo. Lo que vos describiste —bases de datos
relacionales, snapshots de presupuestos, historial de precios, curvas superpuestas— es
un sistema de información, no una planilla. Forzarlo en Excel es como resolver un edificio
en altura con muros portantes: se puede hasta cierto piso, y después no.

**Además, y esto es lo decisivo:** Claude Code rinde muchísimo mejor en un proyecto de
código real, porque puede ejecutar el programa, ver que falla y corregirse solo. Con VBA
está ciego: te escribe código que no puede probar.

**Lo que no perdés:** la app exporta a Excel y a PDF. Vos vas a seguir presentando
planillas en el formato de siempre. Lo que cambia es dónde vive la inteligencia.

**Si igual preferís Excel** (por ejemplo porque tu equipo tiene que editar las planillas
directamente), es una decisión válida, pero decidila ahora y no a mitad de camino.
Cambiar de rumbo en la fase 5 significa tirar todo.

---

## 4. Cómo es una sesión de trabajo

Cada sesión tiene siempre la misma forma. Son entre una y tres horas.

**1. Abrís.** Terminal en la carpeta del proyecto, escribís `claude`.

**2. Pegás el prompt de la fase.** Del archivo `PROMPTS-POR-FASE.md`. Uno solo.

**3. Leés el plan y lo aprobás.** Claude te va a proponer qué va a hacer.
*Este es el momento más importante de toda la sesión.* Leelo como leerías el cómputo
de un contratista antes de firmar. ¿Entendió lo que pediste? ¿Falta algo? ¿Agregó cosas
que no pediste? Si algo no cierra, decilo ahora: corregir un plan cuesta dos minutos,
corregir código hecho cuesta una sesión entera.

**4. Lo dejás trabajar.** Va a escribir archivos, correr comandos, equivocarse y
corregirse. Es normal ver errores en pantalla: forma parte del proceso, igual que un
replanteo que se corrige antes de hormigonar. Te va a pedir permiso para ciertas cosas
(instalar librerías, ejecutar comandos): decile que sí, salvo que te pida borrar algo.

**5. Probás vos.** Abrís `http://localhost:3000` en el navegador y usás la app **como si
fuera un día normal de trabajo**. No mires el código. Cargá datos reales de una obra que
conozcas y fijate si los números dan.

**6. Reportás o aprobás.** Si algo está mal, usás el prompt de reporte de problemas.
Si está bien, cerrás con el prompt de cierre de sesión.

**Regla de oro: nunca cierres una sesión sin haber probado vos mismo lo que se hizo.**
"Listo, funciona" dicho por Claude no es una recepción de obra. Es una autocertificación
del contratista.

---

## 5. Cómo dar feedback que sirva

La diferencia entre alguien que avanza rápido con estas herramientas y alguien que se
frustra está casi enteramente acá.

**Describí el síntoma, no la solución.** Vos sabés de obra, no de programación. Si decís
"cambiá la fórmula de la línea 47" estás haciendo un diagnóstico que no te corresponde y
probablemente sea equivocado. Decí qué pasó y qué esperabas.

| ❌ Poco útil | ✅ Útil |
|---|---|
| "No anda" | "Cargué cantidad 25 en el ítem de mampostería y el precio total quedó en cero" |
| "El presupuesto está mal" | "El subtotal del rubro 3 me da $840.000 y sumando a mano da $910.000" |
| "Hacelo más lindo" | "La grilla del presupuesto no me deja ver los totales sin bajar hasta el final" |
| "Cambiá la función de cálculo" | "El coeficiente resumen me da 1.62 y en mi planilla da 1.71" |

**Cuando un número no cierra, pedí el desagregado antes de pedir la corrección.** Muchas
veces el programa está bien y el criterio es distinto al tuyo. Ahí no hay que corregir
código: hay que explicitar el criterio en `CLAUDE.md`.

**Una cosa por vez.** Si encontraste cinco problemas, mandá uno, esperá, verificá, y
seguí. Cinco juntos garantizan que dos se resuelvan mal.

---

## 6. Cuándo llamar a tu hijo

No lo llames por dudas de funcionamiento: eso preguntáselo a Claude, que además conoce
tu proyecto. Llamalo en estos casos concretos:

- **Instalación inicial.** Node.js, git y Claude Code en tu máquina. Es media hora y se
  hace una sola vez. Que lo haga él, es puro trámite.
- **Git se puso raro.** Palabras como *conflict*, *detached HEAD*, *merge*. Frená, no
  toques nada, llamalo.
- **Se perdieron datos.** Frená inmediatamente. No sigas trabajando (cada acción posterior
  dificulta la recuperación).
- **Claude propone reescribir todo.** Si en la fase 6 te dice que hay que rehacer la
  arquitectura, es una decisión de fondo. Que la mire alguien más.
- **Fase 8, exportación.** Los formatos de Excel y PDF son el punto donde más conviene
  una segunda opinión técnica.
- **Cuando quieras compartir la app** con tu estudio o llevarla a otra computadora.

Antes de llamarlo, tené a mano: qué estabas haciendo, el mensaje de error tal cual
aparece (captura de pantalla), y en qué fase estás. Con eso lo resuelve en cinco minutos.

---

## 7. Las trampas de las que nadie te avisa

**Aceptar código que no probaste.** Es la número uno, por lejos. Se acumulan tres fases
de cosas que "parecían andar" y cuando aparece el problema no sabés de dónde viene.

**Mezclar fases en una misma conversación.** Cuanto más larga la conversación, más se le
diluye el contexto a Claude. Una fase, una sesión, `/clear` al terminar.

**Ampliar el alcance sobre la marcha.** "Ya que estamos, agregale…". Es exactamente el
adicional de obra que descalabra el plan. Anotalo como pendiente en `CLAUDE.md` y seguí.

**No respaldar.** Cada vez que termines de cargar datos importantes, copiá `datos/obra.db`
a otra carpeta con la fecha en el nombre. Treinta segundos.

**Perseguir lo lindo antes que lo correcto.** Es tentador pedir mejoras visuales en la
fase 2. No lo hagas: el diseño se ajusta al final, cuando ya sabés cómo lo usás de verdad.

**Creer que "sin errores" significa "correcto".** Que la pantalla muestre un número no
significa que el número esté bien. La única validación que vale es la tuya: comparar
contra un presupuesto que ya hiciste y cuyo resultado conocés.

---

## 8. Criterios de recepción por fase

Tu lista de inspección. No aprobés una fase sin poder tildar todo.

**Fase 0** — La app abre en el navegador. Podés navegar entre las secciones aunque estén
vacías. Existe un README que explica cómo arrancarla.

**Fase 1** — Cargás 20 insumos reales. Actualizás un precio y ves el historial con las
dos fechas. Aplicás un 15% a un grupo de insumos de una sola vez. Importás un Excel de
proveedor.

**Fase 2** — Armás una APU que ya tengas hecha en planilla y **el costo unitario coincide**.
Cambiás el precio de un material y el costo se actualiza solo. El coeficiente resumen se
muestra paso por paso.

**Fase 3** — Cargás un presupuesto chico completo. Cargando solo cantidades, todo lo demás
se completa. Las incidencias porcentuales suman 100. Cambiás la fecha base de precios y
todo se recalcula.

**Fase 4** — Los totales de mano de obra, materiales y equipos coinciden con la suma de
los ítems. Movés el porcentaje de beneficio y el total responde en vivo.

**Fase 5** — Creás un ítem que no estaba, cargás su APU a mano, la guardás en catálogo, y
la usás en otra obra distinta. Marcás una obra como presentada, cambiás un precio maestro
y **el presupuesto presentado no se mueve**.

**Fase 6** — Planificás seis meses. Movés una barra del Gantt y la curva teórica cambia.
La certificación proyectada del último mes coincide con el total del presupuesto.

**Fase 7** — Cargás tres meses de avance con un atraso deliberado. La curva real aparece
por debajo de la teórica. El rubro atrasado se pone en rojo y aparece en el panel de
acciones correctivas.

**Fase 8** — Exportás el presupuesto a Excel y se abre bien. Imprimís una APU y tiene tu
formato. Emitís un certificado con anticipo y fondo de reparo, y los números cierran.

---

## 9. Expectativas realistas

**Tiempo.** De ocho a doce sesiones para tener el sistema funcionando, más un tiempo
parecido de uso real hasta que esté afinado. Es normal, y es muchísimo menos de lo que
tardarías en armar lo mismo en planilla.

**Retrocesos.** Va a haber fases que se rehagan. No es fracaso, es el equivalente a un
cambio de proyecto durante la obra: pasa siempre, y en software es infinitamente más barato.

**El punto de inflexión.** Alrededor de la fase 4 o 5 vas a empezar a intuir cómo está
armado el sistema, y ahí tus pedidos se van a volver mucho más precisos. A partir de ahí
acelera todo.

**El valor real de la fase 2.** Poder recalcular todos tus presupuestos a precios de hoy
cambiando una fecha ya justifica el proyecto entero, incluso si nunca llegás a la fase 7.
Si en algún momento el proyecto se te hace largo, tené presente que en la fase 4 ya tenés
una herramienta que usarías todos los días.

---

## 10. Los tres comandos que vas a usar

```bash
cd ruta/a/programa-obra     # pararte en la carpeta del proyecto
claude                      # abrir Claude Code
npm run dev                 # arrancar la app (después abrís localhost:3000)
```

Y dentro de Claude Code:

```
/clear                      # empezar conversación nueva (al cambiar de fase)
```

Todo lo demás se lo pedís a Claude en castellano.
