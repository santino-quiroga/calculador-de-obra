"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actualizarPreciosEnLote } from "@/lib/acciones/insumos";
import { hoyISO } from "@/lib/formato";

export function ActualizacionLoteDialog({
  abierto,
  onOpenChange,
  insumoIds,
  onGuardado,
}: {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  insumoIds: number[];
  onGuardado: () => void;
}) {
  const [porcentaje, setPorcentaje] = useState("");
  const [fechaVigencia, setFechaVigencia] = useState(hoyISO());
  const [guardando, setGuardando] = useState(false);

  async function manejarSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);

    try {
      const resultado = await actualizarPreciosEnLote({
        insumoIds,
        porcentaje: Number(porcentaje),
        fechaVigencia,
      });

      if (resultado.omitidos.length > 0) {
        toast.warning(
          `Actualizados ${resultado.actualizados}. Omitidos ${resultado.omitidos.length} (sin precio previo cargado).`
        );
      } else {
        toast.success(`Se actualizó el precio de ${resultado.actualizados} insumos.`);
      }

      onGuardado();
      onOpenChange(false);
      setPorcentaje("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar en lote");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={manejarSubmit}>
          <DialogHeader>
            <DialogTitle>Actualizar precios en lote</DialogTitle>
            <DialogDescription>
              Se va a aplicar el porcentaje a {insumoIds.length} insumo
              {insumoIds.length === 1 ? "" : "s"} seleccionado
              {insumoIds.length === 1 ? "" : "s"}, sobre su precio vigente hoy. Esto inserta
              un precio nuevo para cada uno — no pisa el historial.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="porcentaje">Porcentaje de aumento</Label>
              <Input
                id="porcentaje"
                type="number"
                step="0.01"
                required
                placeholder="Ej: 15 (o -5 para una baja)"
                value={porcentaje}
                onChange={(e) => setPorcentaje(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fechaVigenciaLote">Vigente desde</Label>
              <Input
                id="fechaVigenciaLote"
                type="date"
                required
                value={fechaVigencia}
                onChange={(e) => setFechaVigencia(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={guardando}>
              {guardando ? "Aplicando..." : "Aplicar a los seleccionados"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
