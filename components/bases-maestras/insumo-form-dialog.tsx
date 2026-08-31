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
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { crearInsumo, editarInsumo } from "@/lib/acciones/insumos";
import { hoyISO } from "@/lib/formato";
import type { InsumoFila } from "./bases-maestras-client";

const ETIQUETAS_TIPO: Record<string, string> = {
  material: "Material",
  mano_obra: "Mano de obra",
  equipo: "Equipo",
};

export function InsumoFormDialog({
  abierto,
  onOpenChange,
  insumo,
  onGuardado,
}: {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  insumo: InsumoFila | null;
  onGuardado: () => void;
}) {
  const esEdicion = insumo !== null;

  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [unidad, setUnidad] = useState("");
  const [tipo, setTipo] = useState<"material" | "mano_obra" | "equipo">("material");
  const [precioInicial, setPrecioInicial] = useState("");
  const [fechaVigencia, setFechaVigencia] = useState(hoyISO());
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setCodigo(insumo?.codigo ?? "");
    setDescripcion(insumo?.descripcion ?? "");
    setUnidad(insumo?.unidad ?? "");
    setTipo((insumo?.tipo as "material" | "mano_obra" | "equipo") ?? "material");
    setPrecioInicial("");
    setFechaVigencia(hoyISO());
  }, [abierto, insumo]);

  async function manejarSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);

    try {
      const datos = { codigo, descripcion, unidad, tipo };

      if (esEdicion && insumo) {
        await editarInsumo(insumo.id, datos);
        toast.success("Insumo actualizado");
      } else {
        const precio = precioInicial.trim() === "" ? undefined : Number(precioInicial);
        await crearInsumo({
          ...datos,
          precioInicial: precio
            ? { precio, fechaVigencia, fuente: undefined }
            : undefined,
        });
        toast.success("Insumo creado");
      }

      onGuardado();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el insumo");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={manejarSubmit}>
          <DialogHeader>
            <DialogTitle>{esEdicion ? "Editar insumo" : "Nuevo insumo"}</DialogTitle>
            <DialogDescription>
              {esEdicion
                ? "Cambiar código, descripción, unidad o tipo. Para el precio, usá el historial."
                : "Cargá los datos del insumo. El precio inicial es opcional."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="codigo">Código</Label>
              <Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} required />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="unidad">Unidad</Label>
                <Input
                  id="unidad"
                  placeholder="m2, kg, hora, u..."
                  value={unidad}
                  onChange={(e) => setUnidad(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ETIQUETAS_TIPO).map(([valor, etiqueta]) => (
                      <SelectItem key={valor} value={valor}>
                        {etiqueta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!esEdicion && (
              <div className="grid grid-cols-2 gap-4 rounded-md border border-dashed border-neutral-300 p-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="precioInicial">Precio inicial (opcional)</Label>
                  <Input
                    id="precioInicial"
                    type="number"
                    step="0.01"
                    min="0"
                    value={precioInicial}
                    onChange={(e) => setPrecioInicial(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="fechaVigencia">Vigente desde</Label>
                  <Input
                    id="fechaVigencia"
                    type="date"
                    value={fechaVigencia}
                    onChange={(e) => setFechaVigencia(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
