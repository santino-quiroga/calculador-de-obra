"use client";

// Gantt de solo lectura para el control de obra: la misma grilla de columnas
// que el Gantt de Plan de trabajos (Fase 6), pero acá las barras no se
// arrastran — cada tarea muestra su barra de contrato (gris) y, superpuesta
// y más angosta, la barra de lo realmente ejecutado hasta la fecha de corte
// (CLAUDE.md: "el Gantt pasa a mostrar dos barras por tarea: contrato y
// real"). El % ejecutado de una tarea es la suma de sus avances mensuales
// cargados — cada avance ya es "lo hecho ese mes", así que sumarlos da el
// acumulado.

import { useMemo } from "react";

import { cn } from "@/lib/utils";
import { formatearFecha } from "@/lib/formato";
import type { listarControlDeObra } from "@/lib/acciones/control-obra";
import type { Semaforo } from "@/lib/calculo/valor-ganado";

type Control = NonNullable<Awaited<ReturnType<typeof listarControlDeObra>>>;
type RubroControl = Control["rubros"][number];
type TareaControl = NonNullable<RubroControl["tarea"]>;

const PX_POR_DIA = 8;

const COLOR_SEMAFORO: Record<Semaforo, string> = {
  verde: "bg-emerald-500",
  amarillo: "bg-amber-500",
  rojo: "bg-red-500",
};

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

interface Columna {
  fechaISO: string;
  etiqueta: string;
  dias: number;
}

function construirColumnas(rangoInicio: Date, rangoFin: Date): Columna[] {
  const columnas: Columna[] = [];
  const formateadorMes = new Intl.DateTimeFormat("es-AR", { month: "short", year: "numeric" });

  let cursor = inicioDeMes(rangoInicio);
  while (cursor <= rangoFin) {
    const finMes = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
    const finVisible = finMes < rangoFin ? finMes : rangoFin;
    const dias = Math.round((finVisible.getTime() - cursor.getTime()) / 86400000) + 1;
    columnas.push({ fechaISO: cursor.toISOString().slice(0, 10), etiqueta: formateadorMes.format(cursor), dias });
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }

  return columnas;
}

function pctAcumulado(tarea: TareaControl): number {
  const suma = tarea.avances.reduce((total, avance) => total + (avance.porcentajeEjecutado ?? 0), 0);
  return Math.min(100, Math.max(0, suma));
}

export function GanttControl({
  rubros,
  expandidos,
  onToggleExpandir,
  onAbrirAvance,
}: {
  rubros: RubroControl[];
  expandidos: Set<number>;
  onToggleExpandir: (rubroId: number) => void;
  onAbrirAvance: (tarea: TareaControl, etiqueta: string, esItem: boolean, unidad: string | null, cantidadContractual: number | null) => void;
}) {
  const semaforoPorRubro = useMemo(() => new Map(rubros.map((r) => [r.rubroId, r.semaforo])), [rubros]);

  const todasLasTareas = useMemo(() => {
    const tareas: TareaControl[] = [];
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

  if (!rango) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-neutral-500">
        Esta obra todavía no tiene tareas planificadas en Plan de trabajos.
      </p>
    );
  }

  const columnas = construirColumnas(rango.inicio, rango.fin);
  const anchoTotalPx = columnas.reduce((suma, c) => suma + c.dias * PX_POR_DIA, 0);

  function Barra({ tarea, colorContrato, semaforo }: { tarea: TareaControl; colorContrato: string; semaforo: Semaforo }) {
    const inicioPx = diasEntre(rango!.inicio.toISOString().slice(0, 10), tarea.fechaInicio) * PX_POR_DIA;
    const anchoPx = Math.max((diasEntre(tarea.fechaInicio, tarea.fechaFin) + 1) * PX_POR_DIA, PX_POR_DIA * 2);
    const pct = pctAcumulado(tarea);
    const anchoRealPx = Math.max((anchoPx * pct) / 100, pct > 0 ? 4 : 0);

    return (
      <div
        className="relative h-10"
        style={{ width: anchoTotalPx }}
        title={`${formatearFecha(tarea.fechaInicio)} — ${formatearFecha(tarea.fechaFin)} · ${pct.toFixed(0)}% ejecutado`}
      >
        <div className={cn("absolute top-1 h-4 rounded", colorContrato)} style={{ left: inicioPx, width: anchoPx }} />
        <div
          className={cn("absolute top-6 h-3 rounded", COLOR_SEMAFORO[semaforo])}
          style={{ left: inicioPx, width: anchoRealPx }}
        />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <div style={{ minWidth: anchoTotalPx + 280 }}>
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

        {rubros.map((rubro) => {
          const semaforo = semaforoPorRubro.get(rubro.rubroId) ?? "verde";
          return (
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
                    {rubro.tarea && (
                      <button
                        className="text-xs text-blue-600 hover:underline"
                        onClick={() => onAbrirAvance(rubro.tarea!, rubro.nombre, false, null, null)}
                      >
                        Cargar avance
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  {rubro.tarea ? (
                    <Barra tarea={rubro.tarea} colorContrato="bg-neutral-800" semaforo={semaforo} />
                  ) : (
                    <div className="h-10" />
                  )}
                </div>
              </div>

              {expandidos.has(rubro.rubroId) &&
                rubro.items.map((item) => (
                  <div key={item.id} className="flex items-center border-b bg-neutral-50/50">
                    <div className="w-64 shrink-0 border-r py-1 pl-8 pr-2">
                      <p className="truncate text-sm">{item.descripcion}</p>
                      {item.tarea && (
                        <button
                          className="text-xs text-blue-600 hover:underline"
                          onClick={() => onAbrirAvance(item.tarea!, item.descripcion, true, item.unidad, item.cantidad)}
                        >
                          Cargar avance
                        </button>
                      )}
                    </div>
                    <div>
                      {item.tarea ? (
                        <Barra tarea={item.tarea} colorContrato="bg-blue-600" semaforo={semaforo} />
                      ) : (
                        <div className="h-10" />
                      )}
                    </div>
                  </div>
                ))}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 border-t bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded bg-neutral-800" /> Contrato
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded bg-emerald-500" /> Real — al día
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded bg-amber-500" /> Real — atención
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded bg-red-500" /> Real — atrasado
        </span>
      </div>
    </div>
  );
}
