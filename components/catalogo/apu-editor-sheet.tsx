"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calcularApuDeItem, eliminarComponente, obtenerItemCatalogo } from "@/lib/acciones/catalogo";
import { hoyISO } from "@/lib/formato";
import { ApuDesglose } from "./apu-desglose";
import type { InsumoParaCatalogo } from "./catalogo-client";
import { ComponenteFormDialog } from "./componente-form-dialog";

type DetalleItem = Awaited<ReturnType<typeof obtenerItemCatalogo>>;
type ComponenteDetalle = NonNullable<DetalleItem>["componentes"][number];
type ResultadoCalculo = Awaited<ReturnType<typeof calcularApuDeItem>>;
type TipoComponente = "material" | "mano_obra" | "equipo";

const ETIQUETAS_TIPO: Record<TipoComponente, string> = {
  material: "Materiales",
  mano_obra: "Mano de obra",
  equipo: "Equipos",
};

export function ApuEditorSheet({
  itemId,
  onOpenChange,
  insumos,
  onCambio,
}: {
  itemId: number | null;
  onOpenChange: (abierto: boolean) => void;
  insumos: InsumoParaCatalogo[];
  onCambio: () => void;
}) {
  const [detalle, setDetalle] = useState<DetalleItem>(null);
  const [calculo, setCalculo] = useState<ResultadoCalculo | null>(null);
  const [fecha, setFecha] = useState(hoyISO());
  const [cargando, setCargando] = useState(false);

  const [dialogoComponenteAbierto, setDialogoComponenteAbierto] = useState(false);
  const [tipoNuevoComponente, setTipoNuevoComponente] = useState<TipoComponente>("material");
  const [componenteEditando, setComponenteEditando] = useState<ComponenteDetalle | null>(null);

  useEffect(() => {
    if (!itemId) {
      setDetalle(null);
      setCalculo(null);
      return;
    }

    const fechaInicial = hoyISO();
    setFecha(fechaInicial);
    cargarTodo(itemId, fechaInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  async function cargarTodo(id: number, fechaConsulta: string) {
    setCargando(true);
    try {
      const [detalleNuevo, calculoNuevo] = await Promise.all([
        obtenerItemCatalogo(id),
        calcularApuDeItem(id, fechaConsulta),
      ]);
      setDetalle(detalleNuevo);
      setCalculo(calculoNuevo);
    } finally {
      setCargando(false);
    }
  }

  async function manejarCambiarFecha(nuevaFecha: string) {
    setFecha(nuevaFecha);
    if (!itemId) return;
    setCargando(true);
    try {
      setCalculo(await calcularApuDeItem(itemId, nuevaFecha));
    } finally {
      setCargando(false);
    }
  }

  async function refrescarDespuesDeEditar() {
    if (itemId) await cargarTodo(itemId, fecha);
    onCambio();
  }

  async function manejarEliminarComponente(id: number) {
    try {
      await eliminarComponente(id);
      toast.success("Línea eliminada");
      refrescarDespuesDeEditar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la línea");
    }
  }

  return (
    <Sheet open={itemId !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        {detalle && (
          <>
            <SheetHeader>
              <SheetTitle>
                {detalle.item.codigo} — {detalle.item.descripcion}
              </SheetTitle>
              <SheetDescription>
                {detalle.item.unidad} · {detalle.item.origen === "sistema" ? "Ítem de sistema" : "Ítem de usuario"}
              </SheetDescription>
            </SheetHeader>

            {(Object.keys(ETIQUETAS_TIPO) as TipoComponente[]).map((tipo) => {
              const lineasDelTipo = detalle.componentes.filter((c) => c.tipo === tipo);

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

            <div className="mt-6 flex items-end gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="fechaCalculo">Fecha de cálculo</Label>
                <Input
                  id="fechaCalculo"
                  type="date"
                  value={fecha}
                  onChange={(e) => manejarCambiarFecha(e.target.value)}
                  className="w-48"
                />
              </div>
              {cargando && <p className="text-sm text-neutral-500">Calculando...</p>}
            </div>

            {calculo && <ApuDesglose calculo={calculo} />}

            <ComponenteFormDialog
              abierto={dialogoComponenteAbierto}
              onOpenChange={setDialogoComponenteAbierto}
              tipo={tipoNuevoComponente}
              insumos={insumos.filter((i) => i.tipo === tipoNuevoComponente && i.activo)}
              itemCatalogoId={detalle.item.id}
              componente={componenteEditando}
              onGuardado={refrescarDespuesDeEditar}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
