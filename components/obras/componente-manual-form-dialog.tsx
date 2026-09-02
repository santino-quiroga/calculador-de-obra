"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { agregarComponenteManual, editarComponenteManual } from "@/lib/acciones/presupuesto";
import type { InsumoParaPresupuesto } from "./presupuesto-client";

const ETIQUETAS_TIPO = { material: "material", mano_obra: "mano de obra", equipo: "equipo" } as const;

interface ComponenteExistente {
  id: number;
  insumoId: number;
  cantidadUnitaria: number | null;
  desperdicioPct: number | null;
  rendimientoHoras: number | null;
}

export function ComponenteManualFormDialog({
  abierto,
  onOpenChange,
  tipo,
  insumos,
  presupuestoItemId,
  componente,
  onGuardado,
}: {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  tipo: "material" | "mano_obra" | "equipo";
  insumos: InsumoParaPresupuesto[];
  presupuestoItemId: number;
  componente: ComponenteExistente | null;
  onGuardado: () => void;
}) {
  const esEdicion = componente !== null;
  const [insumoId, setInsumoId] = useState("");
  const [cantidadUnitaria, setCantidadUnitaria] = useState("");
  const [desperdicioPct, setDesperdicioPct] = useState("0");
  const [rendimientoHoras, setRendimientoHoras] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setInsumoId(componente ? String(componente.insumoId) : "");
    setCantidadUnitaria(componente?.cantidadUnitaria != null ? String(componente.cantidadUnitaria) : "");
    setDesperdicioPct(componente?.desperdicioPct != null ? String(componente.desperdicioPct) : "0");
    setRendimientoHoras(componente?.rendimientoHoras != null ? String(componente.rendimientoHoras) : "");
  }, [abierto, componente]);

  async function manejarSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);

    try {
      const datos =
        tipo === "material"
          ? {
              tipo: "material" as const,
              insumoId: Number(insumoId),
              cantidadUnitaria: Number(cantidadUnitaria),
              desperdicioPct: Number(desperdicioPct),
            }
          : {
              tipo,
              insumoId: Number(insumoId),
              rendimientoHoras: Number(rendimientoHoras),
            };

      if (esEdicion && componente) {
        await editarComponenteManual(componente.id, datos);
        toast.success("Línea actualizada");
      } else {
        await agregarComponenteManual(presupuestoItemId, datos);
        toast.success("Línea agregada");
      }

      onGuardado();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la línea");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={manejarSubmit}>
          <DialogHeader>
            <DialogTitle>
              {esEdicion ? "Editar" : "Agregar"} línea de {ETIQUETAS_TIPO[tipo]}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 grid gap-4">
            <div className="grid gap-1.5">
              <Label>Insumo</Label>
              <Select value={insumoId} onValueChange={setInsumoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Elegí un insumo" />
                </SelectTrigger>
                <SelectContent>
                  {insumos.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-neutral-500">
                      No hay insumos de este tipo cargados en Bases maestras.
                    </div>
                  ) : (
                    insumos.map((i) => (
                      <SelectItem key={i.id} value={String(i.id)}>
                        {i.codigo} — {i.descripcion}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {tipo === "material" ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="cantidadUnitariaManual">Cantidad por unidad de ítem</Label>
                  <Input
                    id="cantidadUnitariaManual"
                    type="number"
                    step="0.0001"
                    min="0"
                    required
                    value={cantidadUnitaria}
                    onChange={(e) => setCantidadUnitaria(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="desperdicioPctManual">Desperdicio (%)</Label>
                  <Input
                    id="desperdicioPctManual"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={desperdicioPct}
                    onChange={(e) => setDesperdicioPct(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-1.5">
                <Label htmlFor="rendimientoHorasManual">Horas por unidad de ítem</Label>
                <Input
                  id="rendimientoHorasManual"
                  type="number"
                  step="0.0001"
                  min="0"
                  required
                  value={rendimientoHoras}
                  onChange={(e) => setRendimientoHoras(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={guardando || insumoId === ""}>
              {guardando ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
