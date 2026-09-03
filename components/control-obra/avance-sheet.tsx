"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cargarAvancePeriodo, eliminarAvancePeriodo } from "@/lib/acciones/control-obra";
import { formatearFecha } from "@/lib/formato";

export interface AvanceFila {
  id: number;
  periodo: string;
  cantidadEjecutada: number | null;
  porcentajeEjecutado: number | null;
  fechaCarga: string;
  observacion: string | null;
}

export interface AvanceSheetInfo {
  tareaId: number;
  etiqueta: string;
  esItem: boolean;
  unidad: string | null;
  cantidadContractual: number | null;
  avances: AvanceFila[];
}

function mesActualISO() {
  return new Date().toISOString().slice(0, 7);
}

export function AvanceSheet({
  tarea,
  onOpenChange,
  onGuardado,
}: {
  tarea: AvanceSheetInfo | null;
  onOpenChange: (abierto: boolean) => void;
  onGuardado: () => void;
}) {
  const [periodo, setPeriodo] = useState(mesActualISO());
  const [cantidad, setCantidad] = useState("");
  const [porcentaje, setPorcentaje] = useState("");
  const [ultimoEditado, setUltimoEditado] = useState<"cantidad" | "porcentaje">("porcentaje");
  const [observacion, setObservacion] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!tarea) return;
    const periodos = tarea.avances.map((a) => a.periodo).sort();
    const ultimoPeriodo = periodos.at(-1);
    const siguiente = ultimoPeriodo ? sumarMes(ultimoPeriodo) : mesActualISO();
    setPeriodo(siguiente);
    setCantidad("");
    setPorcentaje("");
    setObservacion("");
  }, [tarea]);

  function sumarMes(periodoISO: string) {
    const [anio, mes] = periodoISO.split("-").map(Number);
    const fecha = new Date(Date.UTC(anio, mes, 1)); // mes es 1-indexado acá, así que ya cae en el siguiente
    return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  const cantidadPreview =
    tarea?.esItem && tarea.cantidadContractual && ultimoEditado === "porcentaje" && porcentaje
      ? ((Number(porcentaje) || 0) / 100) * tarea.cantidadContractual
      : null;
  const porcentajePreview =
    tarea?.esItem && tarea.cantidadContractual && ultimoEditado === "cantidad" && cantidad
      ? ((Number(cantidad) || 0) / tarea.cantidadContractual) * 100
      : null;

  async function manejarGuardar() {
    if (!tarea) return;
    if (!cantidad && !porcentaje) {
      toast.error("Cargá una cantidad ejecutada o un porcentaje");
      return;
    }

    setGuardando(true);
    try {
      await cargarAvancePeriodo(tarea.tareaId, {
        periodo,
        cantidadEjecutada: tarea.esItem && cantidad ? Number(cantidad) : null,
        porcentajeEjecutado: porcentaje ? Number(porcentaje) : null,
        observacion: observacion || undefined,
      });
      toast.success(`Avance de ${periodo} guardado`);
      onGuardado();
      setCantidad("");
      setPorcentaje("");
      setObservacion("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el avance");
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEliminar(id: number) {
    setGuardando(true);
    try {
      await eliminarAvancePeriodo(id);
      toast.success("Avance eliminado");
      onGuardado();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el avance");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Sheet open={tarea !== null} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{tarea?.etiqueta ?? "Avance"}</SheetTitle>
          <SheetDescription>
            {tarea?.esItem
              ? `Cargá la cantidad ejecutada en ${tarea.unidad} o el porcentaje — el otro se calcula solo.`
              : "Esta barra agrupa un rubro completo: cargá el porcentaje de avance del mes."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="periodoAvance">Mes</Label>
            <Input
              id="periodoAvance"
              type="month"
              className="w-40"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {tarea?.esItem && (
              <div className="grid gap-1.5">
                <Label htmlFor="cantidadEjecutada">Cantidad ejecutada ({tarea.unidad})</Label>
                <Input
                  id="cantidadEjecutada"
                  type="number"
                  step="0.01"
                  min="0"
                  value={cantidad}
                  placeholder={cantidadPreview !== null ? cantidadPreview.toFixed(2) : undefined}
                  onChange={(e) => {
                    setCantidad(e.target.value);
                    setUltimoEditado("cantidad");
                  }}
                />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="porcentajeEjecutado">Porcentaje ejecutado</Label>
              <Input
                id="porcentajeEjecutado"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={porcentaje}
                placeholder={porcentajePreview !== null ? porcentajePreview.toFixed(2) : undefined}
                onChange={(e) => {
                  setPorcentaje(e.target.value);
                  setUltimoEditado("porcentaje");
                }}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="observacionAvance">Observación (opcional)</Label>
            <Input id="observacionAvance" value={observacion} onChange={(e) => setObservacion(e.target.value)} />
          </div>

          <Button onClick={manejarGuardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar avance del mes"}
          </Button>
        </div>

        {tarea && tarea.avances.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-medium">Avances ya cargados</p>
            <Table className="mt-2">
              <TableHeader>
                <TableRow>
                  <TableHead>Mes</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Cargado</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...tarea.avances]
                  .sort((a, b) => (a.periodo < b.periodo ? 1 : -1))
                  .map((avance) => (
                    <TableRow key={avance.id}>
                      <TableCell>{avance.periodo}</TableCell>
                      <TableCell>{avance.cantidadEjecutada?.toFixed(2) ?? "—"}</TableCell>
                      <TableCell>{avance.porcentajeEjecutado?.toFixed(1) ?? "—"}%</TableCell>
                      <TableCell>{formatearFecha(avance.fechaCarga)}</TableCell>
                      <TableCell>
                        <button
                          className="text-xs text-red-600 hover:underline"
                          onClick={() => manejarEliminar(avance.id)}
                          disabled={guardando}
                        >
                          Eliminar
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
