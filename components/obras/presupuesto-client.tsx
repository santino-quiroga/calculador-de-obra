"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { listarItemsCatalogo } from "@/lib/acciones/catalogo";
import type { listarInsumos } from "@/lib/acciones/insumos";
import { cambiarEstadoObra, editarObra } from "@/lib/acciones/obras";
import type { listarPresupuesto } from "@/lib/acciones/presupuesto";
import {
  editarCantidadPresupuesto,
  eliminarItemPresupuesto,
  presentarObra,
  reordenarItemsDeRubro,
} from "@/lib/acciones/presupuesto";
import type { listarRubros } from "@/lib/acciones/rubros";
import { formatearFecha, formatearMoneda } from "@/lib/formato";
import { AgregarItemDialog } from "./agregar-item-dialog";
import { ObraFormDialog } from "./obra-form-dialog";
import type { ObraFila } from "./obras-client";
import { PresupuestoApuSheet } from "./presupuesto-apu-sheet";

export type PresupuestoResultado = NonNullable<Awaited<ReturnType<typeof listarPresupuesto>>>;
export type RubroParaPresupuesto = Awaited<ReturnType<typeof listarRubros>>[number];
export type ItemCatalogoParaPresupuesto = Awaited<ReturnType<typeof listarItemsCatalogo>>[number];
export type InsumoParaPresupuesto = Awaited<ReturnType<typeof listarInsumos>>[number];
export type PresupuestoItemFila = PresupuestoResultado["rubros"][number]["items"][number];

const ETIQUETAS_ESTADO: Record<string, string> = {
  borrador: "Borrador",
  presentado: "Presentado",
  en_ejecucion: "En ejecución",
  cerrada: "Cerrada",
};

export function PresupuestoClient({
  presupuestoInicial,
  rubros,
  itemsCatalogo,
  insumos,
}: {
  presupuestoInicial: PresupuestoResultado;
  rubros: RubroParaPresupuesto[];
  itemsCatalogo: ItemCatalogoParaPresupuesto[];
  insumos: InsumoParaPresupuesto[];
}) {
  const router = useRouter();
  const [presupuesto, setPresupuesto] = useState(presupuestoInicial);
  useEffect(() => setPresupuesto(presupuestoInicial), [presupuestoInicial]);

  const { obra } = presupuesto;

  const [dialogoObraAbierto, setDialogoObraAbierto] = useState(false);
  const [dialogoAgregarAbierto, setDialogoAgregarAbierto] = useState(false);
  const [itemApuAbierto, setItemApuAbierto] = useState<PresupuestoItemFila | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [cantidadesEnEdicion, setCantidadesEnEdicion] = useState<Record<number, string>>({});

  function refrescar() {
    router.refresh();
  }

  async function manejarCambiarFechaBase(nuevaFecha: string) {
    try {
      await editarObra(obra.id, {
        nombre: obra.nombre,
        comitente: obra.comitente ?? undefined,
        ubicacion: obra.ubicacion ?? undefined,
        fechaBasePrecios: nuevaFecha,
        tipoLicitacion: obra.tipoLicitacion ?? undefined,
        anticipoPct: obra.anticipoPct ?? undefined,
        fondoReparoPct: obra.fondoReparoPct ?? undefined,
      });
      toast.success("Fecha base actualizada — presupuesto recalculado");
      refrescar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar la fecha base");
    }
  }

  async function manejarCambiarEstado(nuevoEstado: string) {
    try {
      if (nuevoEstado === "presentado") {
        await presentarObra(obra.id);
        toast.success("Obra presentada — se congeló la composición de cada APU con los precios de hoy");
      } else {
        await cambiarEstadoObra(obra.id, nuevoEstado as typeof obra.estado);
        toast.success("Estado actualizado");
      }
      refrescar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar el estado");
    }
  }

  async function manejarGuardarCantidad(itemId: number, valor: string) {
    const cantidad = Number(valor);
    if (!(cantidad > 0)) return;
    try {
      await editarCantidadPresupuesto(itemId, cantidad);
      refrescar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la cantidad");
    }
  }

  async function manejarEliminar(itemId: number) {
    try {
      await eliminarItemPresupuesto(itemId);
      toast.success("Ítem eliminado");
      refrescar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el ítem");
    }
  }

  async function manejarDrop(rubroId: number, idsDelRubro: number[], targetId: number) {
    if (draggingId === null || draggingId === targetId) return;

    const sinArrastrado = idsDelRubro.filter((id) => id !== draggingId);
    const indiceDestino = sinArrastrado.indexOf(targetId);
    sinArrastrado.splice(indiceDestino, 0, draggingId);

    setDraggingId(null);

    try {
      await reordenarItemsDeRubro(obra.id, rubroId, sinArrastrado);
      refrescar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo reordenar");
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{obra.nombre}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {obra.comitente ?? "Sin comitente"} · {obra.ubicacion ?? "Sin ubicación"}
          </p>
        </div>
        <Button variant="outline" onClick={() => setDialogoObraAbierto(true)}>
          Editar obra
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4 rounded-md border p-4">
        <div className="grid gap-1.5">
          <Label htmlFor="fechaBasePresupuesto">Fecha base de precios</Label>
          <Input
            id="fechaBasePresupuesto"
            type="date"
            className="w-48"
            value={obra.fechaBasePrecios}
            onChange={(e) => manejarCambiarFechaBase(e.target.value)}
          />
        </div>

        <div className="grid gap-1.5">
          <Label>Estado</Label>
          <Select value={obra.estado} onValueChange={manejarCambiarEstado}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ETIQUETAS_ESTADO).map(([valor, etiqueta]) => (
                <SelectItem key={valor} value={valor}>
                  {etiqueta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {obra.estado === "presentado" && (
          <p className="max-w-sm text-xs text-neutral-500">
            La composición y el precio de cada ítem quedaron congelados con los valores de cuando se
            presentó. Cambiar el catálogo o los precios de ahora en más no los altera.
          </p>
        )}

        <Button className="ml-auto" onClick={() => setDialogoAgregarAbierto(true)}>
          + Agregar ítem
        </Button>
      </div>

      <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Nº</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Precio unitario</TableHead>
              <TableHead>Precio total</TableHead>
              <TableHead>Incidencia</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {presupuesto.rubros.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-neutral-500">
                  Todavía no hay ítems cargados en este presupuesto.
                </TableCell>
              </TableRow>
            ) : (
              presupuesto.rubros.map((grupo) => {
                const idsDelRubro = grupo.items.map((item) => item.id);
                return (
                  <Fragment key={grupo.rubroId}>
                    <TableRow className="bg-neutral-50 font-medium">
                      <TableCell />
                      <TableCell>{grupo.nroRubro}</TableCell>
                      <TableCell colSpan={4}>{grupo.nombre}</TableCell>
                      <TableCell>{formatearMoneda(grupo.subtotal)}</TableCell>
                      <TableCell>{grupo.incidenciaPct.toFixed(1)}%</TableCell>
                      <TableCell />
                    </TableRow>
                    {grupo.items.map((item) => (
                      <TableRow
                        key={item.id}
                        draggable
                        onDragStart={() => setDraggingId(item.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => manejarDrop(grupo.rubroId, idsDelRubro, item.id)}
                        className={draggingId === item.id ? "opacity-50" : undefined}
                      >
                        <TableCell className="cursor-move text-neutral-400">⠿</TableCell>
                        <TableCell>{item.nroItem}</TableCell>
                        <TableCell>
                          <button className="text-left hover:underline" onClick={() => setItemApuAbierto(item)}>
                            {item.descripcion}
                          </button>
                          {item.congelado && (
                            <Badge variant="outline" className="ml-2 align-middle">
                              Congelado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{item.unidad}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.0001"
                            min="0"
                            className="w-24"
                            value={cantidadesEnEdicion[item.id] ?? String(item.cantidad)}
                            onChange={(e) =>
                              setCantidadesEnEdicion((anterior) => ({ ...anterior, [item.id]: e.target.value }))
                            }
                            onBlur={(e) => manejarGuardarCantidad(item.id, e.target.value)}
                          />
                        </TableCell>
                        <TableCell>{formatearMoneda(item.precioUnitario)}</TableCell>
                        <TableCell>{formatearMoneda(item.precioTotal)}</TableCell>
                        <TableCell>{item.incidenciaPct.toFixed(1)}%</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => manejarEliminar(item.id)}>
                            Eliminar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="sticky bottom-0 mt-0 flex items-center justify-between rounded-b-md border border-t-0 bg-white p-4 shadow-[0_-2px_6px_rgba(0,0,0,0.05)]">
        <span className="text-sm font-medium text-neutral-600">Total presupuesto</span>
        <span className="text-xl font-semibold">{formatearMoneda(presupuesto.totalPresupuesto)}</span>
      </div>

      <ObraFormDialog
        abierto={dialogoObraAbierto}
        onOpenChange={setDialogoObraAbierto}
        obra={obra as ObraFila}
        onGuardado={refrescar}
      />

      <AgregarItemDialog
        abierto={dialogoAgregarAbierto}
        onOpenChange={setDialogoAgregarAbierto}
        obraId={obra.id}
        rubros={rubros}
        itemsCatalogo={itemsCatalogo}
        onGuardado={refrescar}
      />

      <PresupuestoApuSheet
        item={itemApuAbierto}
        fechaBasePrecios={obra.fechaBasePrecios}
        insumos={insumos}
        itemsCatalogo={itemsCatalogo}
        onOpenChange={(abierto) => !abierto && setItemApuAbierto(null)}
        onCambio={refrescar}
      />
    </div>
  );
}
