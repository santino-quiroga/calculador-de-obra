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
import { crearObra, editarObra } from "@/lib/acciones/obras";
import { hoyISO } from "@/lib/formato";
import type { ObraFila } from "./obras-client";

export function ObraFormDialog({
  abierto,
  onOpenChange,
  obra,
  onGuardado,
}: {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  obra: ObraFila | null;
  onGuardado: () => void;
}) {
  const esEdicion = obra !== null;

  const [nombre, setNombre] = useState("");
  const [comitente, setComitente] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [fechaBasePrecios, setFechaBasePrecios] = useState(hoyISO());
  const [tipoLicitacion, setTipoLicitacion] = useState<"publica" | "privada" | "">("");
  const [anticipoPct, setAnticipoPct] = useState("");
  const [fondoReparoPct, setFondoReparoPct] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setNombre(obra?.nombre ?? "");
    setComitente(obra?.comitente ?? "");
    setUbicacion(obra?.ubicacion ?? "");
    setFechaBasePrecios(obra?.fechaBasePrecios ?? hoyISO());
    setTipoLicitacion((obra?.tipoLicitacion as "publica" | "privada" | null) ?? "");
    setAnticipoPct(obra?.anticipoPct != null ? String(obra.anticipoPct) : "");
    setFondoReparoPct(obra?.fondoReparoPct != null ? String(obra.fondoReparoPct) : "");
  }, [abierto, obra]);

  async function manejarSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);

    try {
      const datos = {
        nombre,
        comitente: comitente.trim() === "" ? undefined : comitente,
        ubicacion: ubicacion.trim() === "" ? undefined : ubicacion,
        fechaBasePrecios,
        tipoLicitacion: tipoLicitacion === "" ? undefined : tipoLicitacion,
        anticipoPct: anticipoPct.trim() === "" ? undefined : Number(anticipoPct),
        fondoReparoPct: fondoReparoPct.trim() === "" ? undefined : Number(fondoReparoPct),
      };

      if (esEdicion && obra) {
        await editarObra(obra.id, datos);
        toast.success("Obra actualizada");
      } else {
        await crearObra(datos);
        toast.success("Obra creada");
      }

      onGuardado();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la obra");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={manejarSubmit}>
          <DialogHeader>
            <DialogTitle>{esEdicion ? "Editar obra" : "Nueva obra"}</DialogTitle>
          </DialogHeader>

          <div className="mt-4 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="nombreObra">Nombre</Label>
              <Input id="nombreObra" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="comitenteObra">Comitente</Label>
                <Input id="comitenteObra" value={comitente} onChange={(e) => setComitente(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ubicacionObra">Ubicación</Label>
                <Input id="ubicacionObra" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="fechaBaseObra">Fecha base de precios</Label>
                <Input
                  id="fechaBaseObra"
                  type="date"
                  required
                  value={fechaBasePrecios}
                  onChange={(e) => setFechaBasePrecios(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Tipo de licitación</Label>
                <Select
                  value={tipoLicitacion || "sin_definir"}
                  onValueChange={(v) => setTipoLicitacion(v === "sin_definir" ? "" : (v as "publica" | "privada"))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin_definir">Sin definir</SelectItem>
                    <SelectItem value="publica">Pública</SelectItem>
                    <SelectItem value="privada">Privada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="anticipoObra">Anticipo (%)</Label>
                <Input
                  id="anticipoObra"
                  type="number"
                  step="0.01"
                  min="0"
                  value={anticipoPct}
                  onChange={(e) => setAnticipoPct(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fondoReparoObra">Fondo de reparo (%)</Label>
                <Input
                  id="fondoReparoObra"
                  type="number"
                  step="0.01"
                  min="0"
                  value={fondoReparoPct}
                  onChange={(e) => setFondoReparoPct(e.target.value)}
                />
              </div>
            </div>
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
