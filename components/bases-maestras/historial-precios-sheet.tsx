"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { agregarPrecio, listarHistorialPrecios } from "@/lib/acciones/insumos";
import { formatearFecha, formatearMoneda, hoyISO } from "@/lib/formato";
import type { InsumoFila } from "./bases-maestras-client";

type RegistroHistorial = Awaited<ReturnType<typeof listarHistorialPrecios>>[number];

export function HistorialPreciosSheet({
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
  const [historial, setHistorial] = useState<RegistroHistorial[]>([]);
  const [cargando, setCargando] = useState(false);
  const [precio, setPrecio] = useState("");
  const [fechaVigencia, setFechaVigencia] = useState(hoyISO());
  const [fuente, setFuente] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto || !insumo) return;
    setCargando(true);
    listarHistorialPrecios(insumo.id)
      .then(setHistorial)
      .finally(() => setCargando(false));
    setPrecio("");
    setFechaVigencia(hoyISO());
    setFuente("");
  }, [abierto, insumo]);

  async function manejarAgregarPrecio(evento: React.FormEvent) {
    evento.preventDefault();
    if (!insumo) return;
    setGuardando(true);

    try {
      await agregarPrecio(insumo.id, {
        precio: Number(precio),
        fechaVigencia,
        fuente: fuente.trim() === "" ? undefined : fuente,
      });
      toast.success("Precio agregado al historial");
      const nuevoHistorial = await listarHistorialPrecios(insumo.id);
      setHistorial(nuevoHistorial);
      setPrecio("");
      setFuente("");
      onGuardado();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo agregar el precio");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Sheet open={abierto} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{insumo?.descripcion ?? "Historial de precios"}</SheetTitle>
          <SheetDescription>
            Evolución completa del precio. Nunca se pisa un registro: cada actualización
            agrega una fila nueva con su fecha de vigencia.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={manejarAgregarPrecio} className="mt-6 grid gap-3 rounded-md border p-3">
          <p className="text-sm font-medium">Agregar precio nuevo</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="nuevoPrecio">Precio</Label>
              <Input
                id="nuevoPrecio"
                type="number"
                step="0.01"
                min="0"
                required
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="nuevaFechaVigencia">Vigente desde</Label>
              <Input
                id="nuevaFechaVigencia"
                type="date"
                required
                value={fechaVigencia}
                onChange={(e) => setFechaVigencia(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="fuente">Fuente (opcional)</Label>
            <Input
              id="fuente"
              placeholder="Ej: presupuesto de proveedor XYZ"
              value={fuente}
              onChange={(e) => setFuente(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={guardando} className="justify-self-start">
            {guardando ? "Guardando..." : "Agregar al historial"}
          </Button>
        </form>

        <div className="mt-6">
          <p className="mb-2 text-sm font-medium">Historial</p>
          {cargando ? (
            <p className="text-sm text-neutral-500">Cargando...</p>
          ) : historial.length === 0 ? (
            <p className="text-sm text-neutral-500">Todavía no tiene precios cargados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vigente desde</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Fuente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historial.map((registro) => (
                  <TableRow key={registro.id}>
                    <TableCell>{formatearFecha(registro.fechaVigencia)}</TableCell>
                    <TableCell>{formatearMoneda(registro.precio)}</TableCell>
                    <TableCell className="text-neutral-500">{registro.fuente ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
