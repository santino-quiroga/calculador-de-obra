"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { actualizarFechasTarea, cambiarCurvaTarea, eliminarTarea } from "@/lib/acciones/plan-trabajos";
import { listarPeriodosEntre, type Granularidad, type TipoCurva } from "@/lib/calculo/curva-inversion";
import { formatearMoneda } from "@/lib/formato";

export interface TareaSheetInfo {
  id: number;
  etiqueta: string;
  monto: number;
  fechaInicio: string;
  fechaFin: string;
  curva: TipoCurva;
  distribucionManual: Record<string, number> | null;
}

const ETIQUETAS_CURVA: Record<TipoCurva, string> = {
  lineal: "Lineal",
  campana: "Campana",
  manual: "Manual (% por período)",
};

export function TareaSheet({
  tarea,
  granularidad,
  onOpenChange,
  onGuardado,
}: {
  tarea: TareaSheetInfo | null;
  granularidad: Granularidad;
  onOpenChange: (abierto: boolean) => void;
  onGuardado: () => void;
}) {
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [curva, setCurva] = useState<TipoCurva>("lineal");
  const [porcentajes, setPorcentajes] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!tarea) return;
    setFechaInicio(tarea.fechaInicio);
    setFechaFin(tarea.fechaFin);
    setCurva(tarea.curva);
    setPorcentajes(
      Object.fromEntries(
        listarPeriodosEntre(tarea.fechaInicio, tarea.fechaFin, granularidad).map((periodo) => [
          periodo,
          String(tarea.distribucionManual?.[periodo] ?? 0),
        ])
      )
    );
  }, [tarea, granularidad]);

  useEffect(() => {
    if (curva !== "manual" || !fechaInicio || !fechaFin || fechaInicio > fechaFin) return;
    setPorcentajes((anterior) => {
      const periodos = listarPeriodosEntre(fechaInicio, fechaFin, granularidad);
      const siguiente: Record<string, string> = {};
      for (const periodo of periodos) siguiente[periodo] = anterior[periodo] ?? "0";
      return siguiente;
    });
  }, [fechaInicio, fechaFin, curva, granularidad]);

  const sumaPorcentajes = Object.values(porcentajes).reduce((suma, valor) => suma + (Number(valor) || 0), 0);

  async function manejarGuardar() {
    if (!tarea) return;
    if (fechaInicio > fechaFin) {
      toast.error("La fecha de inicio tiene que ser anterior o igual a la de fin");
      return;
    }
    if (curva === "manual" && Math.abs(sumaPorcentajes - 100) > 0.01) {
      toast.error("Los porcentajes tienen que sumar 100%");
      return;
    }

    setGuardando(true);
    try {
      await actualizarFechasTarea(tarea.id, { fechaInicio, fechaFin });
      await cambiarCurvaTarea(tarea.id, {
        curva,
        distribucionManual:
          curva === "manual"
            ? Object.fromEntries(Object.entries(porcentajes).map(([periodo, valor]) => [periodo, Number(valor) || 0]))
            : null,
      });
      toast.success("Tarea actualizada");
      onGuardado();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la tarea");
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEliminar() {
    if (!tarea) return;
    setGuardando(true);
    try {
      await eliminarTarea(tarea.id);
      toast.success("Tarea eliminada del plan");
      onGuardado();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la tarea");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Sheet open={tarea !== null} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{tarea?.etiqueta ?? "Tarea"}</SheetTitle>
          <SheetDescription>{tarea ? formatearMoneda(tarea.monto) : ""}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="fechaInicioTarea">Fecha de inicio</Label>
            <Input
              id="fechaInicioTarea"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="fechaFinTarea">Fecha de fin</Label>
            <Input id="fechaFinTarea" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          </div>
        </div>

        <div className="mt-4 grid gap-1.5">
          <Label>Cómo se reparte el monto en el tiempo</Label>
          <Select value={curva} onValueChange={(v) => setCurva(v as TipoCurva)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ETIQUETAS_CURVA) as TipoCurva[]).map((c) => (
                <SelectItem key={c} value={c}>
                  {ETIQUETAS_CURVA[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {curva === "manual" && (
          <div className="mt-4">
            <p className="text-sm font-medium">Porcentaje por período</p>
            <div className="mt-2 grid gap-2">
              {Object.keys(porcentajes).map((periodo) => (
                <div key={periodo} className="flex items-center gap-2">
                  <span className="w-24 text-sm text-neutral-600">{periodo}</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-28"
                    value={porcentajes[periodo]}
                    onChange={(e) => setPorcentajes((anterior) => ({ ...anterior, [periodo]: e.target.value }))}
                  />
                  <span className="text-sm text-neutral-500">%</span>
                </div>
              ))}
            </div>
            <p
              className={
                Math.abs(sumaPorcentajes - 100) > 0.01
                  ? "mt-2 text-xs text-red-600"
                  : "mt-2 text-xs text-neutral-500"
              }
            >
              Suma: {sumaPorcentajes.toFixed(2)}%
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Button variant="ghost" onClick={manejarEliminar} disabled={guardando}>
            Eliminar tarea
          </Button>
          <Button onClick={manejarGuardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
