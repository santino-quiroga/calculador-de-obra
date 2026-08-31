"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cambiarActivoRubro, crearRubro, editarRubro } from "@/lib/acciones/rubros";
import type { RubroFila } from "./bases-maestras-client";

export function RubrosTab({ rubrosIniciales }: { rubrosIniciales: RubroFila[] }) {
  const router = useRouter();
  const [rubros, setRubros] = useState(rubrosIniciales);
  useEffect(() => setRubros(rubrosIniciales), [rubrosIniciales]);

  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [editando, setEditando] = useState<RubroFila | null>(null);
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [orden, setOrden] = useState("0");
  const [guardando, setGuardando] = useState(false);

  function abrirNuevo() {
    setEditando(null);
    setCodigo("");
    setNombre("");
    setOrden(String(rubros.length + 1));
    setDialogoAbierto(true);
  }

  function abrirEdicion(rubro: RubroFila) {
    setEditando(rubro);
    setCodigo(rubro.codigo);
    setNombre(rubro.nombre);
    setOrden(String(rubro.orden));
    setDialogoAbierto(true);
  }

  async function manejarSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);

    try {
      const datos = { codigo, nombre, orden: Number(orden) };
      if (editando) {
        await editarRubro(editando.id, datos);
        toast.success("Rubro actualizado");
      } else {
        await crearRubro(datos);
        toast.success("Rubro creado");
      }
      setDialogoAbierto(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el rubro");
    } finally {
      setGuardando(false);
    }
  }

  async function manejarCambiarActivo(rubro: RubroFila) {
    try {
      await cambiarActivoRubro(rubro.id, !rubro.activo);
      toast.success(rubro.activo ? "Rubro desactivado" : "Rubro reactivado");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar el estado");
    }
  }

  return (
    <div>
      <div className="flex justify-end">
        <Button onClick={abrirNuevo}>Nuevo rubro</Button>
      </div>

      <div className="mt-4 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Orden</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rubros.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-neutral-500">
                  Todavía no hay rubros cargados.
                </TableCell>
              </TableRow>
            ) : (
              rubros.map((rubro) => (
                <TableRow key={rubro.id}>
                  <TableCell>{rubro.orden}</TableCell>
                  <TableCell>{rubro.codigo}</TableCell>
                  <TableCell>{rubro.nombre}</TableCell>
                  <TableCell>
                    {rubro.activo ? (
                      <Badge variant="outline">Activo</Badge>
                    ) : (
                      <Badge variant="destructive">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => abrirEdicion(rubro)}>
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => manejarCambiarActivo(rubro)}>
                      {rubro.activo ? "Desactivar" : "Reactivar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
        <DialogContent>
          <form onSubmit={manejarSubmit}>
            <DialogHeader>
              <DialogTitle>{editando ? "Editar rubro" : "Nuevo rubro"}</DialogTitle>
            </DialogHeader>
            <div className="mt-4 grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="codigoRubro">Código</Label>
                <Input id="codigoRubro" value={codigo} onChange={(e) => setCodigo(e.target.value)} required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="nombreRubro">Nombre</Label>
                <Input id="nombreRubro" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ordenRubro">Orden</Label>
                <Input
                  id="ordenRubro"
                  type="number"
                  value={orden}
                  onChange={(e) => setOrden(e.target.value)}
                  required
                />
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
    </div>
  );
}
