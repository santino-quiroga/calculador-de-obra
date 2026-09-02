"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ObraFila } from "@/components/obras/obras-client";
import {
  actualizarFechasTarea,
  calcularCurvaTeoricaDeObra,
  crearTareaDeItem,
  generarPlanInicial,
  listarPlanDeTrabajos,
} from "@/lib/acciones/plan-trabajos";
import type { Granularidad, TipoCurva } from "@/lib/calculo/curva-inversion";
import { formatearMoneda, hoyISO, sumarDias } from "@/lib/formato";
import { CertificacionProyectadaTable } from "./certificacion-proyectada-table";
import { CurvaInversionChart } from "./curva-inversion-chart";
import { GanttChart } from "./gantt-chart";
import { TareaSheet, type TareaSheetInfo } from "./tarea-sheet";

type Plan = Awaited<ReturnType<typeof listarPlanDeTrabajos>>;
type CurvaResultado = Awaited<ReturnType<typeof calcularCurvaTeoricaDeObra>>;

const DURACION_ITEM_DIAS = 14;

function buscarTareaInfo(plan: Plan, tareaId: number): TareaSheetInfo | null {
  if (!plan) return null;

  for (const rubro of plan.rubros) {
    if (rubro.tarea?.id === tareaId) {
      return {
        id: tareaId,
        etiqueta: rubro.nombre,
        monto: rubro.montoNeto,
        fechaInicio: rubro.tarea.fechaInicio,
        fechaFin: rubro.tarea.fechaFin,
        curva: rubro.tarea.curva as TipoCurva,
        distribucionManual: rubro.tarea.distribucionManual,
      };
    }
    for (const item of rubro.items) {
      if (item.tarea?.id === tareaId) {
        return {
          id: tareaId,
          etiqueta: item.descripcion,
          monto: item.precioTotal,
          fechaInicio: item.tarea.fechaInicio,
          fechaFin: item.tarea.fechaFin,
          curva: item.tarea.curva as TipoCurva,
          distribucionManual: item.tarea.distribucionManual,
        };
      }
    }
  }
  return null;
}

export function PlanTrabajosClient({ obras }: { obras: ObraFila[] }) {
  const router = useRouter();
  const [obraId, setObraId] = useState("");
  const [plan, setPlan] = useState<Plan>(null);
  const [curvaResultado, setCurvaResultado] = useState<CurvaResultado>(null);
  const [cargando, setCargando] = useState(false);
  const [granularidad, setGranularidad] = useState<Granularidad>("mensual");
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());
  const [fechaInicioPlan, setFechaInicioPlan] = useState(hoyISO());
  const [tareaAbiertaId, setTareaAbiertaId] = useState<number | null>(null);

  async function cargar(idObra: string, gran: Granularidad) {
    if (idObra === "") {
      setPlan(null);
      setCurvaResultado(null);
      return;
    }
    setCargando(true);
    try {
      const [planNuevo, curvaNueva] = await Promise.all([
        listarPlanDeTrabajos(Number(idObra)),
        calcularCurvaTeoricaDeObra(Number(idObra), gran),
      ]);
      setPlan(planNuevo);
      setCurvaResultado(curvaNueva);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar(obraId, granularidad);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obraId, granularidad]);

  function refrescar() {
    cargar(obraId, granularidad);
    router.refresh();
  }

  async function manejarGenerarPlanInicial() {
    try {
      await generarPlanInicial(Number(obraId), { fechaInicio: fechaInicioPlan });
      toast.success("Plan generado — arrastrá o estirá las barras para ajustarlas");
      refrescar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar el plan");
    }
  }

  async function manejarMoverTarea(tareaId: number, fechaInicio: string, fechaFin: string) {
    try {
      await actualizarFechasTarea(tareaId, { fechaInicio, fechaFin });
      refrescar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo mover la tarea");
      refrescar();
    }
  }

  async function manejarCrearTareaRubro() {
    try {
      await generarPlanInicial(Number(obraId), { fechaInicio: hoyISO() });
      toast.success("Rubro planificado");
      refrescar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo planificar el rubro");
    }
  }

  async function manejarCrearTareaItem(itemId: number, rubroId: number) {
    const rubro = plan?.rubros.find((r) => r.rubroId === rubroId);
    const fechaInicio = rubro?.tarea?.fechaInicio ?? hoyISO();
    const fechaFin = sumarDias(fechaInicio, DURACION_ITEM_DIAS - 1);

    try {
      await crearTareaDeItem(Number(obraId), { presupuestoItemId: itemId, rubroId, fechaInicio, fechaFin });
      toast.success("Ítem planificado");
      refrescar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo planificar el ítem");
    }
  }

  function alternarExpandir(rubroId: number) {
    setExpandidos((anterior) => {
      const siguiente = new Set(anterior);
      if (siguiente.has(rubroId)) siguiente.delete(rubroId);
      else siguiente.add(rubroId);
      return siguiente;
    });
  }

  const montoSinPlanificar = plan?.rubros.filter((r) => r.sinPlanificar).reduce((s, r) => s + r.montoNeto, 0) ?? 0;
  const tareaAbierta = tareaAbiertaId !== null ? buscarTareaInfo(plan, tareaAbiertaId) : null;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Plan de trabajos</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Un rubro arranca como una barra. Desplegalo para planificar sus ítems por separado.
        Arrastrá para mover, estirá los bordes para cambiar la duración.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5">
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

        <div className="grid gap-1.5">
          <Label>Escala</Label>
          <Tabs value={granularidad} onValueChange={(v) => setGranularidad(v as Granularidad)}>
            <TabsList>
              <TabsTrigger value="mensual">Mensual</TabsTrigger>
              <TabsTrigger value="semanal">Semanal</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {cargando && <p className="mt-6 text-sm text-neutral-500">Calculando...</p>}

      {plan && (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap items-end gap-4 rounded-md border p-4">
            <div className="grid gap-1.5">
              <Label htmlFor="fechaInicioPlan">Fecha de inicio del plan</Label>
              <Input
                id="fechaInicioPlan"
                type="date"
                className="w-48"
                value={fechaInicioPlan}
                onChange={(e) => setFechaInicioPlan(e.target.value)}
              />
            </div>
            <Button onClick={manejarGenerarPlanInicial}>Generar / completar plan</Button>
            <p className="max-w-sm text-xs text-neutral-500">
              Crea una barra de 30 días por cada rubro que todavía no tenga una — una atrás de la
              otra. Es seguro usarlo de nuevo si agregás un rubro al presupuesto más adelante.
            </p>
          </div>

          {montoSinPlanificar > 0 && (
            <p className="text-sm text-amber-700">
              Hay {formatearMoneda(montoSinPlanificar)} del presupuesto todavía sin planificar — la
              curva de abajo no los incluye hasta que les des una barra.
            </p>
          )}

          <GanttChart
            rubros={plan.rubros}
            granularidad={granularidad}
            expandidos={expandidos}
            onToggleExpandir={alternarExpandir}
            onClickTarea={setTareaAbiertaId}
            onCrearTareaRubro={manejarCrearTareaRubro}
            onCrearTareaItem={manejarCrearTareaItem}
            onMoverTarea={manejarMoverTarea}
          />

          <div>
            <p className="text-sm font-medium">Curva de inversión teórica acumulada</p>
            <CurvaInversionChart curva={curvaResultado?.curva ?? []} />
          </div>

          <div>
            <p className="text-sm font-medium">Certificación proyectada</p>
            <div className="mt-2 max-h-96 overflow-y-auto rounded-md border">
              <CertificacionProyectadaTable curva={curvaResultado?.curva ?? []} />
            </div>
          </div>
        </div>
      )}

      <TareaSheet
        tarea={tareaAbierta}
        granularidad={granularidad}
        onOpenChange={(abierto) => !abierto && setTareaAbiertaId(null)}
        onGuardado={refrescar}
      />
    </div>
  );
}
