"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ObraFila } from "@/components/obras/obras-client";
import { listarControlDeObra } from "@/lib/acciones/control-obra";
import { AccionesCorrectivasPanel } from "./acciones-correctivas-panel";
import { AvanceSheet, type AvanceSheetInfo } from "./avance-sheet";
import { CurvaComparadaChart } from "./curva-comparada-chart";
import { GanttControl } from "./gantt-control";
import { SemaforoRubrosTable } from "./semaforo-rubros-table";

type Control = Awaited<ReturnType<typeof listarControlDeObra>>;

// Solo guarda los datos que no cambian al recargar (id, etiqueta, unidad);
// la lista de avances se busca en `control` en cada render, así la ficha
// siempre muestra el último dato guardado sin quedarse con una foto vieja.
interface AvanceAbierto {
  tareaId: number;
  etiqueta: string;
  esItem: boolean;
  unidad: string | null;
  cantidadContractual: number | null;
}

function buscarAvances(control: Control, tareaId: number): AvanceSheetInfo["avances"] {
  if (!control) return [];
  for (const rubro of control.rubros) {
    if (rubro.tarea?.id === tareaId) return rubro.tarea.avances;
    for (const item of rubro.items) {
      if (item.tarea?.id === tareaId) return item.tarea.avances;
    }
  }
  return [];
}

export function ControlObraClient({ obras }: { obras: ObraFila[] }) {
  const router = useRouter();
  const [obraId, setObraId] = useState("");
  const [control, setControl] = useState<Control>(null);
  const [cargando, setCargando] = useState(false);
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());
  const [avanceAbierto, setAvanceAbierto] = useState<AvanceAbierto | null>(null);

  async function cargar(idObra: string) {
    if (idObra === "") {
      setControl(null);
      return;
    }
    setCargando(true);
    try {
      setControl(await listarControlDeObra(Number(idObra)));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar(obraId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obraId]);

  function refrescar() {
    cargar(obraId);
    router.refresh();
  }

  function alternarExpandir(rubroId: number) {
    setExpandidos((anterior) => {
      const siguiente = new Set(anterior);
      if (siguiente.has(rubroId)) siguiente.delete(rubroId);
      else siguiente.add(rubroId);
      return siguiente;
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Control de obra</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Cargá cuánto avanzaste cada mes en cada barra del plan de trabajos. El sistema arma la curva real, calcula el
        desvío contra lo planificado, y avisa qué rubros necesitan una acción correctiva.
      </p>

      <div className="mt-6 grid gap-1.5">
        <Label>Obra</Label>
        <Select value={obraId} onValueChange={setObraId}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Elegí una obra" />
          </SelectTrigger>
          <SelectContent>
            {obras.map((obra) => (
              <SelectItem key={obra.id} value={String(obra.id)}>
                {obra.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {cargando && <p className="mt-6 text-sm text-neutral-500">Calculando...</p>}

      {control && (
        <div className="mt-6 space-y-8">
          <p className="text-sm text-neutral-600">
            {control.periodoCorte
              ? `Corte al mes ${control.periodoCorte} — el último con avances cargados.`
              : "Todavía no cargaste ningún avance en esta obra. Abrí una tarea del Gantt y cargá el primer mes."}
          </p>

          <GanttControl
            rubros={control.rubros}
            expandidos={expandidos}
            onToggleExpandir={alternarExpandir}
            onAbrirAvance={(tarea, etiqueta, esItem, unidad, cantidadContractual) =>
              setAvanceAbierto({ tareaId: tarea.id, etiqueta, esItem, unidad, cantidadContractual })
            }
          />

          <div>
            <p className="text-sm font-medium">Curva de inversión: teórica vs. real</p>
            <CurvaComparadaChart curvaTeorica={control.curvaTeoricaGeneral} curvaReal={control.curvaRealGeneral} />
          </div>

          <div>
            <p className="text-sm font-medium">Semáforo por rubro</p>
            <div className="mt-2 overflow-x-auto rounded-md border">
              <SemaforoRubrosTable rubros={control.rubros} />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">Acciones correctivas</p>
            <div className="mt-2">
              <AccionesCorrectivasPanel obraId={control.obra.id} rubros={control.rubros} onGuardado={refrescar} />
            </div>
          </div>
        </div>
      )}

      <AvanceSheet
        tarea={avanceAbierto ? { ...avanceAbierto, avances: buscarAvances(control, avanceAbierto.tareaId) } : null}
        onOpenChange={(abierto) => !abierto && setAvanceAbierto(null)}
        onGuardado={refrescar}
      />
    </div>
  );
}
