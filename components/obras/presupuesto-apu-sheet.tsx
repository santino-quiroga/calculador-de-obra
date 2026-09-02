"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApuDesglose } from "@/components/catalogo/apu-desglose";
import { calcularApuDeItem } from "@/lib/acciones/catalogo";
import {
  calcularApuDeItemManual,
  eliminarComponenteManual,
  obtenerItemManualPresupuesto,
  obtenerSnapshotDeItem,
} from "@/lib/acciones/presupuesto";
import { formatearFecha } from "@/lib/formato";
import { ComponenteManualFormDialog } from "./componente-manual-form-dialog";
import { GuardarEnCatalogoDialog } from "./guardar-en-catalogo-dialog";
import type {
  InsumoParaPresupuesto,
  ItemCatalogoParaPresupuesto,
  PresupuestoItemFila,
} from "./presupuesto-client";

type ResultadoCalculoCatalogo = Awaited<ReturnType<typeof calcularApuDeItem>>;
type DetalleManual = Awaited<ReturnType<typeof obtenerItemManualPresupuesto>>;
type ComponenteDetalle = NonNullable<DetalleManual>["componentes"][number];
type TipoComponente = "material" | "mano_obra" | "equipo";

const ETIQUETAS_TIPO: Record<TipoComponente, string> = {
  material: "Materiales",
  mano_obra: "Mano de obra",
  equipo: "Equipos",
};

export function PresupuestoApuSheet({
  item,
  fechaBasePrecios,
  insumos,
  itemsCatalogo,
  onOpenChange,
  onCambio,
}: {
  item: PresupuestoItemFila | null;
  fechaBasePrecios: string;
  insumos: InsumoParaPresupuesto[];
  itemsCatalogo: ItemCatalogoParaPresupuesto[];
  onOpenChange: (abierto: boolean) => void;
  onCambio: () => void;
}) {
  const [cargando, setCargando] = useState(false);

  // Modo "congelado": ítem con snapshot (presentado alguna vez)
  const [snapshot, setSnapshot] = useState<{ fechaSnapshot: string; calculo: ResultadoCalculoCatalogo } | null>(
    null
  );

  // Modo "catálogo en vivo"
  const [calculoCatalogo, setCalculoCatalogo] = useState<ResultadoCalculoCatalogo | null>(null);

  // Modo "manual editable"
  const [detalleManual, setDetalleManual] = useState<DetalleManual>(null);
  const [calculoManual, setCalculoManual] = useState<ResultadoCalculoCatalogo | null>(null);
  const [dialogoComponenteAbierto, setDialogoComponenteAbierto] = useState(false);
  const [tipoNuevoComponente, setTipoNuevoComponente] = useState<TipoComponente>("material");
  const [componenteEditando, setComponenteEditando] = useState<ComponenteDetalle | null>(null);
  const [dialogoGuardarAbierto, setDialogoGuardarAbierto] = useState(false);

  useEffect(() => {
    setSnapshot(null);
    setCalculoCatalogo(null);
    setDetalleManual(null);
    setCalculoManual(null);

    if (!item) return;

    if (item.congelado) {
      setCargando(true);
      obtenerSnapshotDeItem(item.id)
        .then(setSnapshot)
        .finally(() => setCargando(false));
      return;
    }

    if (item.itemCatalogoId !== null) {
      setCargando(true);
      calcularApuDeItem(item.itemCatalogoId, fechaBasePrecios)
        .then(setCalculoCatalogo)
        .finally(() => setCargando(false));
      return;
    }

    cargarManual(item.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, fechaBasePrecios]);

  async function cargarManual(presupuestoItemId: number) {
    setCargando(true);
    try {
      const [detalle, calculo] = await Promise.all([
        obtenerItemManualPresupuesto(presupuestoItemId),
        calcularApuDeItemManual(presupuestoItemId, fechaBasePrecios),
      ]);
      setDetalleManual(detalle);
      setCalculoManual(calculo);
    } finally {
      setCargando(false);
    }
  }

  async function refrescarManual() {
    if (item) await cargarManual(item.id);
    onCambio();
  }

  async function manejarEliminarComponente(id: number) {
    try {
      await eliminarComponenteManual(id);
      toast.success("Línea eliminada");
      refrescarManual();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la línea");
    }
  }

  function manejarGuardadoEnCatalogo() {
    onCambio();
    // El ítem quedó enganchado al catálogo (o a uno existente): la próxima
    // vez que se abra este sheet ya va a entrar por el modo "catálogo".
    onOpenChange(false);
  }

  return (
    <Sheet open={item !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {item?.descripcion ?? "APU"}
            {item?.congelado && <Badge variant="outline">Congelado</Badge>}
          </SheetTitle>
          <SheetDescription>
            {item?.congelado
              ? "Composición y precio congelados al presentar la obra."
              : "Calculado a la fecha base de precios de la obra."}
          </SheetDescription>
        </SheetHeader>

        {cargando && <p className="mt-4 text-sm text-neutral-500">Calculando...</p>}

        {/* Congelado */}
        {snapshot && (
          <>
            <p className="mt-2 text-xs text-neutral-500">Presentado el {formatearFecha(snapshot.fechaSnapshot)}.</p>
            <ApuDesglose calculo={snapshot.calculo} />
          </>
        )}

        {/* Catálogo en vivo */}
        {calculoCatalogo && <ApuDesglose calculo={calculoCatalogo} />}

        {/* Manual editable */}
        {item && !item.congelado && item.itemCatalogoId === null && detalleManual && (
          <>
            {(Object.keys(ETIQUETAS_TIPO) as TipoComponente[]).map((tipo) => {
              const lineasDelTipo = detalleManual.componentes.filter((c) => c.tipo === tipo);

              return (
                <div key={tipo} className="mt-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{ETIQUETAS_TIPO[tipo]}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTipoNuevoComponente(tipo);
                        setComponenteEditando(null);
                        setDialogoComponenteAbierto(true);
                      }}
                    >
                      + Agregar
                    </Button>
                  </div>
                  <Table className="mt-2">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Insumo</TableHead>
                        <TableHead>{tipo === "material" ? "Cantidad" : "Rendimiento (h)"}</TableHead>
                        {tipo === "material" && <TableHead>Desperdicio</TableHead>}
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineasDelTipo.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={tipo === "material" ? 4 : 3}
                            className="text-center text-neutral-500"
                          >
                            Sin líneas todavía.
                          </TableCell>
                        </TableRow>
                      ) : (
                        lineasDelTipo.map((componente) => (
                          <TableRow key={componente.id}>
                            <TableCell>
                              {componente.insumoCodigo} — {componente.insumoDescripcion}
                            </TableCell>
                            <TableCell>
                              {tipo === "material" ? componente.cantidadUnitaria : componente.rendimientoHoras}{" "}
                              {tipo === "material" ? componente.insumoUnidad : "h"}
                            </TableCell>
                            {tipo === "material" && <TableCell>{componente.desperdicioPct}%</TableCell>}
                            <TableCell className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setTipoNuevoComponente(tipo);
                                  setComponenteEditando(componente);
                                  setDialogoComponenteAbierto(true);
                                }}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => manejarEliminarComponente(componente.id)}
                              >
                                Eliminar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              );
            })}

            {calculoManual && <ApuDesglose calculo={calculoManual} />}

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setDialogoGuardarAbierto(true)}>Guardar en catálogo</Button>
            </div>

            <ComponenteManualFormDialog
              abierto={dialogoComponenteAbierto}
              onOpenChange={setDialogoComponenteAbierto}
              tipo={tipoNuevoComponente}
              insumos={insumos.filter((i) => i.tipo === tipoNuevoComponente && i.activo)}
              presupuestoItemId={detalleManual.item.id}
              componente={componenteEditando}
              onGuardado={refrescarManual}
            />

            <GuardarEnCatalogoDialog
              abierto={dialogoGuardarAbierto}
              onOpenChange={setDialogoGuardarAbierto}
              presupuestoItemId={detalleManual.item.id}
              rubroId={detalleManual.item.rubroId}
              descripcion={detalleManual.item.descripcion}
              itemsCatalogo={itemsCatalogo}
              onGuardado={manejarGuardadoEnCatalogo}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
