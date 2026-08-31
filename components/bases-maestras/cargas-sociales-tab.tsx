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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  cambiarActivoConceptoCargaSocial,
  crearConceptoCargaSocial,
  editarConceptoCargaSocial,
} from "@/lib/acciones/cargas-sociales";
import type { ConceptoCargaSocialFila } from "./bases-maestras-client";

const ETIQUETAS_BASE: Record<string, string> = {
  salario_basico: "Salario básico",
  subtotal_remunerativo: "Subtotal remunerativo",
  base_aportes: "Base de aportes",
  subtotal_liquidado: "Subtotal liquidado",
};

type BaseAplicacion = keyof typeof ETIQUETAS_BASE;

export function CargasSocialesTab({
  conceptosIniciales,
}: {
  conceptosIniciales: ConceptoCargaSocialFila[];
}) {
  const router = useRouter();
  const [conceptos, setConceptos] = useState(conceptosIniciales);
  useEffect(() => setConceptos(conceptosIniciales), [conceptosIniciales]);

  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [editando, setEditando] = useState<ConceptoCargaSocialFila | null>(null);
  const [nombre, setNombre] = useState("");
  const [alicuota, setAlicuota] = useState("");
  const [base, setBase] = useState<BaseAplicacion>("salario_basico");
  const [orden, setOrden] = useState("0");
  const [observacion, setObservacion] = useState("");
  const [guardando, setGuardando] = useState(false);

  const factorAproximado =
    1 + conceptos.filter((c) => c.activo).reduce((suma, c) => suma + c.alicuotaPct, 0) / 100;

  function abrirNuevo() {
    setEditando(null);
    setNombre("");
    setAlicuota("");
    setBase("salario_basico");
    setOrden(String(conceptos.length + 1));
    setObservacion("");
    setDialogoAbierto(true);
  }

  function abrirEdicion(concepto: ConceptoCargaSocialFila) {
    setEditando(concepto);
    setNombre(concepto.nombre);
    setAlicuota(String(concepto.alicuotaPct));
    setBase(concepto.baseAplicacion as BaseAplicacion);
    setOrden(String(concepto.orden));
    setObservacion(concepto.observacion ?? "");
    setDialogoAbierto(true);
  }

  async function manejarSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);

    try {
      const datos = {
        nombre,
        alicuotaPct: Number(alicuota),
        baseAplicacion: base,
        orden: Number(orden),
        observacion: observacion.trim() === "" ? undefined : observacion,
      };
      if (editando) {
        await editarConceptoCargaSocial(editando.id, datos);
        toast.success("Concepto actualizado");
      } else {
        await crearConceptoCargaSocial(datos);
        toast.success("Concepto creado");
      }
      setDialogoAbierto(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el concepto");
    } finally {
      setGuardando(false);
    }
  }

  async function manejarCambiarActivo(concepto: ConceptoCargaSocialFila) {
    try {
      await cambiarActivoConceptoCargaSocial(concepto.id, !concepto.activo);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar el estado");
    }
  }

  return (
    <div>
      <p className="mb-3 text-sm text-neutral-500">
        Cada concepto se acumula sobre su base en el orden que le des. El motor de cálculo de
        la Fase 2 va a aplicar esta cascada exactamente. Como referencia simple (sumando
        alícuotas sin distinguir la base de cada una), hoy equivaldría a un factor aproximado
        de <strong>{factorAproximado.toFixed(4)}</strong>.
      </p>

      <div className="flex justify-end">
        <Button onClick={abrirNuevo}>Nuevo concepto</Button>
      </div>

      <div className="mt-4 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Orden</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Alícuota</TableHead>
              <TableHead>Base de aplicación</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {conceptos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-neutral-500">
                  Todavía no hay conceptos de cargas sociales cargados.
                </TableCell>
              </TableRow>
            ) : (
              conceptos.map((concepto) => (
                <TableRow key={concepto.id}>
                  <TableCell>{concepto.orden}</TableCell>
                  <TableCell>
                    {concepto.nombre}
                    {concepto.observacion && (
                      <p className="text-xs text-neutral-500">{concepto.observacion}</p>
                    )}
                  </TableCell>
                  <TableCell>{concepto.alicuotaPct}%</TableCell>
                  <TableCell>{ETIQUETAS_BASE[concepto.baseAplicacion]}</TableCell>
                  <TableCell>
                    {concepto.activo ? (
                      <Badge variant="outline">Activo</Badge>
                    ) : (
                      <Badge variant="destructive">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => abrirEdicion(concepto)}>
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => manejarCambiarActivo(concepto)}>
                      {concepto.activo ? "Desactivar" : "Reactivar"}
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
              <DialogTitle>{editando ? "Editar concepto" : "Nuevo concepto"}</DialogTitle>
            </DialogHeader>
            <div className="mt-4 grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="nombreConcepto">Nombre</Label>
                <Input
                  id="nombreConcepto"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="alicuotaConcepto">Alícuota (%)</Label>
                  <Input
                    id="alicuotaConcepto"
                    type="number"
                    step="0.01"
                    value={alicuota}
                    onChange={(e) => setAlicuota(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ordenConcepto">Orden</Label>
                  <Input
                    id="ordenConcepto"
                    type="number"
                    value={orden}
                    onChange={(e) => setOrden(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Base de aplicación</Label>
                <Select value={base} onValueChange={(v) => setBase(v as BaseAplicacion)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ETIQUETAS_BASE).map(([valor, etiqueta]) => (
                      <SelectItem key={valor} value={valor}>
                        {etiqueta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="observacionConcepto">Observación (opcional)</Label>
                <Input
                  id="observacionConcepto"
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
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
