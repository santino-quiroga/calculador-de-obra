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
import { promoverItemManualACatalogo, usarItemCatalogoExistente } from "@/lib/acciones/presupuesto";
import { buscarItemsParecidos } from "@/lib/calculo/similitud";
import type { ItemCatalogoParaPresupuesto } from "./presupuesto-client";

export function GuardarEnCatalogoDialog({
  abierto,
  onOpenChange,
  presupuestoItemId,
  rubroId,
  descripcion,
  itemsCatalogo,
  onGuardado,
}: {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  presupuestoItemId: number;
  rubroId: number;
  descripcion: string;
  itemsCatalogo: ItemCatalogoParaPresupuesto[];
  onGuardado: () => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) setCodigo("");
  }, [abierto]);

  const parecidos = buscarItemsParecidos(
    descripcion,
    rubroId,
    itemsCatalogo.filter((i) => i.activo)
  );

  async function manejarGuardarNuevo(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    try {
      await promoverItemManualACatalogo(presupuestoItemId, { codigo });
      toast.success("Ítem guardado en el catálogo");
      onGuardado();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar en el catálogo");
    } finally {
      setGuardando(false);
    }
  }

  async function manejarUsarExistente(itemCatalogoId: number) {
    setGuardando(true);
    try {
      await usarItemCatalogoExistente(presupuestoItemId, itemCatalogoId);
      toast.success("Ítem enganchado al catálogo existente");
      onGuardado();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo usar el ítem existente");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Guardar en catálogo</DialogTitle>
        </DialogHeader>

        {parecidos.length > 0 && (
          <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
            <p className="font-medium text-amber-900">Ya existen ítems parecidos en este rubro:</p>
            <ul className="mt-2 space-y-2">
              {parecidos.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <span>
                    {item.codigo} — {item.descripcion}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={guardando}
                    onClick={() => manejarUsarExistente(item.id)}
                  >
                    Usar este
                  </Button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-amber-800">
              Si de verdad es un ítem distinto, completá el código abajo y guardalo igual como nuevo.
            </p>
          </div>
        )}

        <form onSubmit={manejarGuardarNuevo} className="mt-4">
          <div className="grid gap-1.5">
            <Label htmlFor="codigoNuevoItemCatalogo">Código del ítem nuevo</Label>
            <Input
              id="codigoNuevoItemCatalogo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
              placeholder="Ej: MAM-12"
            />
          </div>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={guardando || codigo.trim() === ""}>
              {guardando ? "Guardando..." : "Guardar como nuevo ítem"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
