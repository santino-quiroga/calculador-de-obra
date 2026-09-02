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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { agregarItemManualPresupuesto, agregarItemPresupuesto } from "@/lib/acciones/presupuesto";
import type { ItemCatalogoParaPresupuesto, RubroParaPresupuesto } from "./presupuesto-client";

const UNIDADES = ["m2", "m3", "ml", "u", "gl", "kg"] as const;

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
  const [modo, setModo] = useState<"catalogo" | "manual">("catalogo");

  const [rubroId, setRubroId] = useState("");
  const [itemCatalogoId, setItemCatalogoId] = useState("");
  const [cantidad, setCantidad] = useState("");

  const [descripcionManual, setDescripcionManual] = useState("");
  const [unidadManual, setUnidadManual] = useState<(typeof UNIDADES)[number]>("m2");

  const [guardando, setGuardando] = useState(false);

  const itemsDelRubro = useMemo(
    () => itemsCatalogo.filter((item) => item.activo && String(item.rubroId) === rubroId),
    [itemsCatalogo, rubroId]
  );

  function cerrarYLimpiar(abierto: boolean) {
    if (!abierto) {
      setModo("catalogo");
      setRubroId("");
      setItemCatalogoId("");
      setCantidad("");
      setDescripcionManual("");
      setUnidadManual("m2");
    }
    onOpenChange(abierto);
  }

  async function manejarSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);

    try {
      if (modo === "catalogo") {
        await agregarItemPresupuesto(obraId, {
          rubroId: Number(rubroId),
          itemCatalogoId: Number(itemCatalogoId),
          cantidad: Number(cantidad),
        });
      } else {
        await agregarItemManualPresupuesto(obraId, {
          rubroId: Number(rubroId),
          descripcion: descripcionManual,
          unidad: unidadManual,
          cantidad: Number(cantidad),
        });
      }
      toast.success("Ítem agregado al presupuesto");
      onGuardado();
      cerrarYLimpiar(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo agregar el ítem");
    } finally {
      setGuardando(false);
    }
  }

  const puedeGuardar =
    rubroId !== "" &&
    cantidad !== "" &&
    (modo === "catalogo" ? itemCatalogoId !== "" : descripcionManual.trim() !== "");

  return (
    <Dialog open={abierto} onOpenChange={cerrarYLimpiar}>
      <DialogContent>
        <form onSubmit={manejarSubmit}>
          <DialogHeader>
            <DialogTitle>Agregar ítem al presupuesto</DialogTitle>
          </DialogHeader>

          <Tabs value={modo} onValueChange={(v) => setModo(v as typeof modo)} className="mt-4">
            <TabsList>
              <TabsTrigger type="button" value="catalogo">
                Del catálogo
              </TabsTrigger>
              <TabsTrigger type="button" value="manual">
                Ítem nuevo
              </TabsTrigger>
            </TabsList>

            <div className="mt-4 grid gap-1.5">
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

            <TabsContent value="catalogo" className="grid gap-4">
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
            </TabsContent>

            <TabsContent value="manual" className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="descripcionManual">Descripción</Label>
                <Input
                  id="descripcionManual"
                  value={descripcionManual}
                  onChange={(e) => setDescripcionManual(e.target.value)}
                  placeholder="Ej: Revoque grueso a la cal, interior"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Unidad</Label>
                <Select value={unidadManual} onValueChange={(v) => setUnidadManual(v as typeof unidadManual)}>
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
              <p className="text-xs text-neutral-500">
                Después de agregarlo vas a poder cargar su APU a mano (materiales, mano de obra y
                equipos) y, si querés, guardarlo en el catálogo para reutilizarlo en otras obras.
              </p>
            </TabsContent>

            <div className="mt-4 grid gap-1.5">
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
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={guardando || !puedeGuardar}>
              {guardando ? "Agregando..." : "Agregar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
