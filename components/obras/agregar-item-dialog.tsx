"use client";

import { useMemo, useState } from "react";
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
import { agregarItemPresupuesto } from "@/lib/acciones/presupuesto";
import type { ItemCatalogoParaPresupuesto, RubroParaPresupuesto } from "./presupuesto-client";

export function AgregarItemDialog({
  abierto,
  onOpenChange,
  obraId,
  rubros,
  itemsCatalogo,
  onGuardado,
}: {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  obraId: number;
  rubros: RubroParaPresupuesto[];
  itemsCatalogo: ItemCatalogoParaPresupuesto[];
  onGuardado: () => void;
}) {
  const [rubroId, setRubroId] = useState("");
  const [itemCatalogoId, setItemCatalogoId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [guardando, setGuardando] = useState(false);

  const itemsDelRubro = useMemo(
    () => itemsCatalogo.filter((item) => item.activo && String(item.rubroId) === rubroId),
    [itemsCatalogo, rubroId]
  );

  function cerrarYLimpiar(abierto: boolean) {
    if (!abierto) {
      setRubroId("");
      setItemCatalogoId("");
      setCantidad("");
    }
    onOpenChange(abierto);
  }

  async function manejarSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);

    try {
      await agregarItemPresupuesto(obraId, {
        rubroId: Number(rubroId),
        itemCatalogoId: Number(itemCatalogoId),
        cantidad: Number(cantidad),
      });
      toast.success("Ítem agregado al presupuesto");
      onGuardado();
      cerrarYLimpiar(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo agregar el ítem");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={cerrarYLimpiar}>
      <DialogContent>
        <form onSubmit={manejarSubmit}>
          <DialogHeader>
            <DialogTitle>Agregar ítem al presupuesto</DialogTitle>
          </DialogHeader>

          <div className="mt-4 grid gap-4">
            <div className="grid gap-1.5">
              <Label>Rubro</Label>
              <Select
                value={rubroId}
                onValueChange={(v) => {
                  setRubroId(v);
                  setItemCatalogoId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elegí un rubro" />
                </SelectTrigger>
                <SelectContent>
                  {rubros
                    .filter((r) => r.activo)
                    .map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Ítem</Label>
              <Select value={itemCatalogoId} onValueChange={setItemCatalogoId} disabled={rubroId === ""}>
                <SelectTrigger>
                  <SelectValue placeholder={rubroId === "" ? "Elegí primero un rubro" : "Elegí un ítem"} />
                </SelectTrigger>
                <SelectContent>
                  {itemsDelRubro.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-neutral-500">
                      No hay ítems de catálogo activos en este rubro.
                    </div>
                  ) : (
                    itemsDelRubro.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.codigo} — {item.descripcion}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="cantidadPresupuesto">Cantidad</Label>
              <Input
                id="cantidadPresupuesto"
                type="number"
                step="0.0001"
                min="0"
                required
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={guardando || itemCatalogoId === ""}>
              {guardando ? "Agregando..." : "Agregar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
