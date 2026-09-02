"use client";

// Gantt propio en SVG/CSS (CLAUDE.md sección 3: sin librerías de terceros).
// Cada rubro es una fila con su barra; al desplegarlo aparecen sus ítems
// como filas hijas, cada uno con su propia barra si ya se planificó. Una
// barra se mueve arrastrando el cuerpo, y se estira arrastrando los bordes
// — todo con mouse events nativos, sin ninguna librería de drag/resize.

import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { formatearFecha, formatearMoneda, sumarDias } from "@/lib/formato";
import type { listarPlanDeTrabajos } from "@/lib/acciones/plan-trabajos";

type Plan = NonNullable<Awaited<ReturnType<typeof listarPlanDeTrabajos>>>;
type RubroPlan = Plan["rubros"][number];
type TareaFila = NonNullable<RubroPlan["tarea"]>;

const PX_POR_DIA = 8;

function fechaADate(fechaISO: string): Date {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

function diasEntre(desde: string, hasta: string): number {
  return Math.round((fechaADate(hasta).getTime() - fechaADate(desde).getTime()) / 86400000);
}

function inicioDeMes(fecha: Date): Date {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1));
}

function inicioDeSemana(fecha: Date): Date {
  const diaIso = fecha.getUTCDay() || 7;
  const d = new Date(fecha);
  d.setUTCDate(d.getUTCDate() - (diaIso - 1));
  return d;
}

interface Columna {
  fechaISO: string;
  etiqueta: string;
  dias: number;
}

function construirColumnas(rangoInicio: Date, rangoFin: Date, granularidad: "mensual" | "semanal"): Columna[] {
  const columnas: Columna[] = [];
  const formateadorMes = new Intl.DateTimeFormat("es-AR", { month: "short", year: "numeric" });

  if (granularidad === "mensual") {
    let cursor = inicioDeMes(rangoInicio);
    let indice = 1;
    while (cursor <= rangoFin) {
      const finMes = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
      const finVisible = finMes < rangoFin ? finMes : rangoFin;
      const dias = Math.round((finVisible.getTime() - cursor.getTime()) / 86400000) + 1;
      columnas.push({
        fechaISO: cursor.toISOString().slice(0, 10),
        etiqueta: formateadorMes.format(cursor),
        dias,
      });
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
      indice += 1;
    }
  } else {
    let cursor = inicioDeSemana(rangoInicio);
    let numero = 1;
    while (cursor <= rangoFin) {
      const finSemana = new Date(cursor);
      finSemana.setUTCDate(finSemana.getUTCDate() + 6);
      const finVisible = finSemana < rangoFin ? finSemana : rangoFin;
      const dias = Math.round((finVisible.getTime() - cursor.getTime()) / 86400000) + 1;
      columnas.push({
        fechaISO: cursor.toISOString().slice(0, 10),
        etiqueta: `Sem ${numero}`,
        dias,
      });
      cursor = new Date(cursor);
      cursor.setUTCDate(cursor.getUTCDate() + 7);
      numero += 1;
    }
  }

  return columnas;
}

type TipoArrastre = "mover" | "redimensionar-izquierda" | "redimensionar-derecha";

interface EstadoArrastre {
  tareaId: number;
  tipo: TipoArrastre;
  xInicial: number;
  fechaInicioOriginal: string;
  fechaFinOriginal: string;
}

export function GanttChart({
  rubros,
  granularidad,
  expandidos,
  onToggleExpandir,
  onClickTarea,
  onCrearTareaRubro,
  onCrearTareaItem,
  onMoverTarea,
}: {
  rubros: RubroPlan[];
  granularidad: "mensual" | "semanal";
  expandidos: Set<number>;
  onToggleExpandir: (rubroId: number) => void;
  onClickTarea: (tareaId: number) => void;
  onCrearTareaRubro: (rubroId: number) => void;
  onCrearTareaItem: (itemId: number, rubroId: number) => void;
  onMoverTarea: (tareaId: number, fechaInicio: string, fechaFin: string) => void;
}) {
  const [arrastre, setArrastre] = useState<EstadoArrastre | null>(null);
  const [overrides, setOverrides] = useState<Map<number, { fechaInicio: string; fechaFin: string }>>(new Map());
  const huboMovimientoRef = useRef(false);
  const ultimaPosicionRef = useRef<{ fechaInicio: string; fechaFin: string } | null>(null);

  useEffect(() => {
    setOverrides(new Map());
  }, [rubros]);

  const todasLasTareas = useMemo(() => {
    const tareas: TareaFila[] = [];
    for (const rubro of rubros) {
      if (rubro.tarea) tareas.push(rubro.tarea);
      for (const item of rubro.items) {
        if (item.tarea) tareas.push(item.tarea);
      }
    }
    return tareas;
  }, [rubros]);

  const rango = useMemo(() => {
    if (todasLasTareas.length === 0) return null;
    const fechas = todasLasTareas.flatMap((t) => [t.fechaInicio, t.fechaFin]);
    const minFecha = fechas.reduce((a, b) => (a < b ? a : b));
    const maxFecha = fechas.reduce((a, b) => (a > b ? a : b));
    return { inicio: fechaADate(minFecha), fin: fechaADate(maxFecha) };
  }, [todasLasTareas]);

  useEffect(() => {
    if (!arrastre) return;

    function alMoverMouse(e: MouseEvent) {
      if (!arrastre) return;
      if (Math.abs(e.clientX - arrastre.xInicial) > 3) huboMovimientoRef.current = true;

      const deltaDias = Math.round((e.clientX - arrastre.xInicial) / PX_POR_DIA);
      let nuevoInicio = arrastre.fechaInicioOriginal;
      let nuevoFin = arrastre.fechaFinOriginal;

      if (arrastre.tipo === "mover") {
        nuevoInicio = sumarDias(arrastre.fechaInicioOriginal, deltaDias);
        nuevoFin = sumarDias(arrastre.fechaFinOriginal, deltaDias);
      } else if (arrastre.tipo === "redimensionar-izquierda") {
        nuevoInicio = sumarDias(arrastre.fechaInicioOriginal, deltaDias);
        if (nuevoInicio > arrastre.fechaFinOriginal) nuevoInicio = arrastre.fechaFinOriginal;
      } else {
        nuevoFin = sumarDias(arrastre.fechaFinOriginal, deltaDias);
        if (nuevoFin < arrastre.fechaInicioOriginal) nuevoFin = arrastre.fechaInicioOriginal;
      }

      ultimaPosicionRef.current = { fechaInicio: nuevoInicio, fechaFin: nuevoFin };
      setOverrides((anterior) => new Map(anterior).set(arrastre.tareaId, { fechaInicio: nuevoInicio, fechaFin: nuevoFin }));
    }

    // Un click sin movimiento abre el panel de la tarea en vez de moverla —
    // se decide acá (al soltar, no en un onClick del div) para no disparar
    // dos actualizaciones de estado (mousedown y click) por el mismo gesto.
    // Importante: los callbacks (onMoverTarea/onClickTarea) se llaman acá
    // afuera de cualquier updater de setState — llamarlos adentro de un
    // setArrastre(prev => ...) dispara el warning de React "no se puede
    // actualizar un componente mientras se renderiza otro", porque esos
    // callbacks terminan actualizando el router (revalidatePath).
    function alSoltarMouse() {
      const tareaActual = arrastre;
      const huboMovimiento = huboMovimientoRef.current;
      const posicionFinal = ultimaPosicionRef.current;

      setArrastre(null);

      if (!tareaActual) return;
      if (huboMovimiento && posicionFinal) {
        onMoverTarea(tareaActual.tareaId, posicionFinal.fechaInicio, posicionFinal.fechaFin);
      } else if (!huboMovimiento) {
        onClickTarea(tareaActual.tareaId);
      }
    }

    window.addEventListener("mousemove", alMoverMouse);
    window.addEventListener("mouseup", alSoltarMouse);
    return () => {
      window.removeEventListener("mousemove", alMoverMouse);
      window.removeEventListener("mouseup", alSoltarMouse);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrastre]);

  if (!rango) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-neutral-500">
        Todavía no hay ninguna tarea planificada en esta obra.
      </p>
    );
  }

  const columnas = construirColumnas(rango.inicio, rango.fin, granularidad);
  const anchoTotalPx = columnas.reduce((suma, c) => suma + c.dias * PX_POR_DIA, 0);

  function posicionDeTarea(tarea: TareaFila) {
    const override = overrides.get(tarea.id);
    const fechaInicio = override?.fechaInicio ?? tarea.fechaInicio;
    const fechaFin = override?.fechaFin ?? tarea.fechaFin;
    const inicioPx = diasEntre(rango!.inicio.toISOString().slice(0, 10), fechaInicio) * PX_POR_DIA;
    const anchoPx = Math.max((diasEntre(fechaInicio, fechaFin) + 1) * PX_POR_DIA, PX_POR_DIA * 2);
    return { inicioPx, anchoPx, fechaInicio, fechaFin };
  }

  function iniciarArrastre(tarea: TareaFila, tipo: TipoArrastre, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    huboMovimientoRef.current = false;
    ultimaPosicionRef.current = null;
    setArrastre({
      tareaId: tarea.id,
      tipo,
      xInicial: e.clientX,
      fechaInicioOriginal: tarea.fechaInicio,
      fechaFinOriginal: tarea.fechaFin,
    });
  }

  function Barra({ tarea, color, etiqueta }: { tarea: TareaFila; color: string; etiqueta: string }) {
    const { inicioPx, anchoPx, fechaInicio, fechaFin } = posicionDeTarea(tarea);
    return (
      <div
        className="relative h-8"
        style={{ width: anchoTotalPx }}
        title={`${formatearFecha(fechaInicio)} — ${formatearFecha(fechaFin)}`}
      >
        <div
          className={cn(
            "group absolute top-1 flex h-6 cursor-grab items-center rounded px-2 text-xs text-white active:cursor-grabbing",
            color
          )}
          style={{ left: inicioPx, width: anchoPx }}
          onMouseDown={(e) => iniciarArrastre(tarea, "mover", e)}
        >
          <div
            className="absolute left-0 top-0 h-full w-2 cursor-ew-resize"
            onMouseDown={(e) => iniciarArrastre(tarea, "redimensionar-izquierda", e)}
          />
          <span className="truncate">{etiqueta}</span>
          <div
            className="absolute right-0 top-0 h-full w-2 cursor-ew-resize"
            onMouseDown={(e) => iniciarArrastre(tarea, "redimensionar-derecha", e)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <div style={{ minWidth: anchoTotalPx + 280 }}>
        {/* Header de columnas */}
        <div className="flex border-b bg-neutral-50 text-xs font-medium text-neutral-500">
          <div className="w-64 shrink-0 border-r px-3 py-2">Rubro / ítem</div>
          <div className="flex">
            {columnas.map((col) => (
              <div key={col.fechaISO} className="shrink-0 border-r px-2 py-2" style={{ width: col.dias * PX_POR_DIA }}>
                {col.etiqueta}
              </div>
            ))}
          </div>
        </div>

        {/* Filas */}
        {rubros.map((rubro) => (
          <div key={rubro.rubroId}>
            <div className="flex items-center border-b">
              <div className="flex w-64 shrink-0 items-center gap-1 border-r px-2 py-1">
                {rubro.items.length > 0 ? (
                  <button
                    className="w-4 text-neutral-400 hover:text-neutral-700"
                    onClick={() => onToggleExpandir(rubro.rubroId)}
                  >
                    {expandidos.has(rubro.rubroId) ? "▾" : "▸"}
                  </button>
                ) : (
                  <span className="w-4" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{rubro.nombre}</p>
                  <p className="text-xs text-neutral-500">{formatearMoneda(rubro.montoNeto)}</p>
                </div>
              </div>
              <div>
                {rubro.tarea ? (
                  <Barra tarea={rubro.tarea} color="bg-neutral-800" etiqueta={rubro.nombre} />
                ) : rubro.montoNeto > 0 ? (
                  <button
                    className="ml-2 mt-1 rounded border border-dashed border-neutral-300 px-2 py-1 text-xs text-neutral-500 hover:border-neutral-500 hover:text-neutral-700"
                    onClick={() => onCrearTareaRubro(rubro.rubroId)}
                  >
                    + Planificar rubro
                  </button>
                ) : (
                  <div className="h-8" />
                )}
              </div>
            </div>

            {expandidos.has(rubro.rubroId) &&
              rubro.items.map((item) => (
                <div key={item.id} className="flex items-center border-b bg-neutral-50/50">
                  <div className="w-64 shrink-0 border-r py-1 pl-8 pr-2">
                    <p className="truncate text-sm">{item.descripcion}</p>
                    <p className="text-xs text-neutral-500">{formatearMoneda(item.precioTotal)}</p>
                  </div>
                  <div>
                    {item.tarea ? (
                      <Barra tarea={item.tarea} color="bg-blue-600" etiqueta={item.descripcion} />
                    ) : (
                      <button
                        className="ml-2 mt-1 rounded border border-dashed border-neutral-300 px-2 py-1 text-xs text-neutral-500 hover:border-neutral-500 hover:text-neutral-700"
                        onClick={() => onCrearTareaItem(item.id, rubro.rubroId)}
                      >
                        + Planificar ítem
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
