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
import { crearItemCatalogo, editarItemCatalogo } from "@/lib/acciones/catalogo";
import type { ItemCatalogoFila, RubroParaCatalogo } from "./catalogo-client";

const UNIDADES = ["m2", "m3", "ml", "u", "gl", "kg"] as const;

export function ItemCatalogoFormDialog({
  abierto,
  onOpenChange,
  item,
  rubros,
  onGuardado,
}: {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  item: ItemCatalogoFila | null;
  rubros: RubroParaCatalogo[];
  onGuardado: () => void;
}) {
  const esEdicion = item !== null;
  const [codigo, setCodigo] = useState("");
  const [rubroId, setRubroId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [unidad, setUnidad] = useState<(typeof UNIDADES)[number]>("m2");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setCodigo(item?.codigo ?? "");
    setRubroId(item ? String(item.rubroId) : "");
    setDescripcion(item?.descripcion ?? "");
    setUnidad((item?.unidad as (typeof UNIDADES)[number]) ?? "m2");
  }, [abierto, item]);

  async function manejarSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);

    try {
      const datos = { codigo, rubroId: Number(rubroId), descripcion, unidad };
      if (esEdicion && item) {
        await editarItemCatalogo(item.id, datos);
        toast.success("Ítem actualizado");
      } else {
        await crearItemCatalogo(datos);
        toast.success("Ítem creado");
      }
      onGuardado();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el ítem");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={manejarSubmit}>
          <DialogHeader>
            <DialogTitle>{esEdicion ? "Editar ítem de catálogo" : "Nuevo ítem de catálogo"}</DialogTitle>
          </DialogHeader>

          <div className="mt-4 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="codigoItem">Código</Label>
              <Input id="codigoItem" value={codigo} onChange={(e) => setCodigo(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="descripcionItem">Descripción</Label>
              <Input
                id="descripcionItem"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Rubro</Label>
                <Select value={rubroId} onValueChange={setRubroId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elegí un rubro" />
                  </SelectTrigger>
                  <SelectContent>
                    {rubros.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Unidad</Label>
                <Select value={unidad} onValueChange={(v) => setUnidad(v as typeof unidad)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={guardando || rubroId === ""}>
              {guardando ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
