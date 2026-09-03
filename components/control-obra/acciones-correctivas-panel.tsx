"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { guardarAccionCorrectiva } from "@/lib/acciones/control-obra";
import { formatearMoneda } from "@/lib/formato";
import type { listarControlDeObra } from "@/lib/acciones/control-obra";

type Control = NonNullable<Awaited<ReturnType<typeof listarControlDeObra>>>;
type RubroControl = Control["rubros"][number];

function FilaAccion({ obraId, rubro, onGuardado }: { obraId: number; rubro: RubroControl; onGuardado: () => void }) {
  const [accionDecidida, setAccionDecidida] = useState(rubro.accion?.accionDecidida ?? "");
  const [responsable, setResponsable] = useState(rubro.accion?.responsable ?? "");
  const [fechaRevision, setFechaRevision] = useState(rubro.accion?.fechaRevision ?? "");
  const [guardando, setGuardando] = useState(false);

  async function manejarGuardar() {
    setGuardando(true);
    try {
      await guardarAccionCorrectiva(obraId, rubro.rubroId, {
        accionDecidida: accionDecidida || undefined,
        responsable: responsable || undefined,
        fechaRevision: fechaRevision || undefined,
      });
      toast.success(`Acción guardada para ${rubro.nombre}`);
      onGuardado();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la acción");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-md border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">{rubro.nombre}</p>
        <p className="text-sm text-red-600">
          Desvío: {formatearMoneda(rubro.sv)} · {rubro.desvioDias !== null ? `${rubro.desvioDias.toFixed(0)} días de atraso` : "—"}
        </p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5 sm:col-span-1">
          <Label>Acción decidida</Label>
          <Input value={accionDecidida} onChange={(e) => setAccionDecidida(e.target.value)} placeholder="Ej: sumar una cuadrilla" />
        </div>
        <div className="grid gap-1.5">
          <Label>Responsable</Label>
          <Input value={responsable} onChange={(e) => setResponsable(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label>Fecha de revisión</Label>
          <Input type="date" value={fechaRevision} onChange={(e) => setFechaRevision(e.target.value)} />
        </div>
      </div>

      <Button className="mt-3" size="sm" onClick={manejarGuardar} disabled={guardando}>
        {guardando ? "Guardando..." : "Guardar"}
      </Button>
    </div>
  );
}

export function AccionesCorrectivasPanel({
  obraId,
  rubros,
  onGuardado,
}: {
  obraId: number;
  rubros: RubroControl[];
  onGuardado: () => void;
}) {
  const rubrosEnRojo = rubros.filter((r) => r.semaforo === "rojo");

  if (rubrosEnRojo.length === 0) {
    return <p className="rounded-md border border-dashed p-6 text-center text-sm text-neutral-500">Ningún rubro está atrasado por ahora.</p>;
  }

  return (
    <div className="grid gap-3">
      {rubrosEnRojo.map((rubro) => (
        <FilaAccion key={rubro.rubroId} obraId={obraId} rubro={rubro} onGuardado={onGuardado} />
      ))}
    </div>
  );
}
