"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cambiarActivoInsumo } from "@/lib/acciones/insumos";
import { formatearMoneda } from "@/lib/formato";
import type { InsumoFila } from "./bases-maestras-client";
import { InsumoFormDialog } from "./insumo-form-dialog";
import { HistorialPreciosSheet } from "./historial-precios-sheet";
import { ActualizacionLoteDialog } from "./actualizacion-lote-dialog";

const ETIQUETAS_TIPO: Record<string, string> = {
  material: "Material",
  mano_obra: "Mano de obra",
  equipo: "Equipo",
};

type FiltroTipo = "todos" | "material" | "mano_obra" | "equipo";

const columnHelper = createColumnHelper<InsumoFila>();

export function InsumosTab({ insumosIniciales }: { insumosIniciales: InsumoFila[] }) {
  const router = useRouter();
  const [insumos, setInsumos] = useState(insumosIniciales);
  useEffect(() => setInsumos(insumosIniciales), [insumosIniciales]);

  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [seleccion, setSeleccion] = useState<Record<number, boolean>>({});

  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [insumoEditando, setInsumoEditando] = useState<InsumoFila | null>(null);

  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [insumoHistorial, setInsumoHistorial] = useState<InsumoFila | null>(null);

  const [loteAbierto, setLoteAbierto] = useState(false);

  function refrescar() {
    router.refresh();
  }

  const filas = useMemo(() => {
    return insumos.filter((fila) => {
      if (!mostrarInactivos && !fila.activo) return false;
      if (filtroTipo !== "todos" && fila.tipo !== filtroTipo) return false;
      return true;
    });
  }, [insumos, filtroTipo, mostrarInactivos]);

  const idsSeleccionados = useMemo(
    () => Object.entries(seleccion).filter(([, marcado]) => marcado).map(([id]) => Number(id)),
    [seleccion]
  );

  const todasMarcadas = filas.length > 0 && filas.every((fila) => seleccion[fila.id]);

  async function manejarCambiarActivo(fila: InsumoFila) {
    try {
      await cambiarActivoInsumo(fila.id, !fila.activo);
      toast.success(fila.activo ? "Insumo desactivado" : "Insumo reactivado");
      refrescar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar el estado");
    }
  }

  const columnas = useMemo(
    () => [
      columnHelper.display({
        id: "seleccion",
        header: () => (
          <Checkbox
            checked={todasMarcadas}
            onCheckedChange={(marcado) => {
              const nuevo = { ...seleccion };
              filas.forEach((fila) => {
                nuevo[fila.id] = Boolean(marcado);
              });
              setSeleccion(nuevo);
            }}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={Boolean(seleccion[row.original.id])}
            onCheckedChange={(marcado) =>
              setSeleccion((anterior) => ({ ...anterior, [row.original.id]: Boolean(marcado) }))
            }
          />
        ),
      }),
      columnHelper.accessor("codigo", { header: "Código" }),
      columnHelper.accessor("descripcion", { header: "Descripción" }),
      columnHelper.accessor("unidad", { header: "Unidad" }),
      columnHelper.accessor("tipo", {
        header: "Tipo",
        cell: ({ getValue }) => <Badge variant="secondary">{ETIQUETAS_TIPO[getValue()]}</Badge>,
      }),
      columnHelper.accessor("precioVigente", {
        header: "Precio vigente",
        cell: ({ getValue }) => formatearMoneda(getValue()),
      }),
      columnHelper.display({
        id: "estado",
        header: "Estado",
        cell: ({ row }) =>
          row.original.activo ? (
            <Badge variant="outline">Activo</Badge>
          ) : (
            <Badge variant="destructive">Inactivo</Badge>
          ),
      }),
      columnHelper.display({
        id: "acciones",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setInsumoHistorial(row.original);
                setHistorialAbierto(true);
              }}
            >
              Historial
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setInsumoEditando(row.original);
                setDialogoAbierto(true);
              }}
            >
              Editar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => manejarCambiarActivo(row.original)}>
              {row.original.activo ? "Desactivar" : "Reactivar"}
            </Button>
          </div>
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seleccion, filas, todasMarcadas]
  );

  const tabla = useReactTable({
    data: filas,
    columns: columnas,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-neutral-200 p-0.5">
          {(["todos", "material", "mano_obra", "equipo"] as FiltroTipo[]).map((valor) => (
            <button
              key={valor}
              type="button"
              onClick={() => setFiltroTipo(valor)}
              className={`rounded px-3 py-1 text-sm transition-colors ${
                filtroTipo === valor
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {valor === "todos" ? "Todos" : ETIQUETAS_TIPO[valor]}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <Checkbox
            checked={mostrarInactivos}
            onCheckedChange={(marcado) => setMostrarInactivos(Boolean(marcado))}
          />
          Mostrar inactivos
        </label>

        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            disabled={idsSeleccionados.length === 0}
            onClick={() => setLoteAbierto(true)}
          >
            Actualizar precios en lote{idsSeleccionados.length > 0 ? ` (${idsSeleccionados.length})` : ""}
          </Button>
          <Button
            onClick={() => {
              setInsumoEditando(null);
              setDialogoAbierto(true);
            }}
          >
            Nuevo insumo
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-md border">
        <Table>
          <TableHeader>
            {tabla.getHeaderGroups().map((grupo) => (
              <TableRow key={grupo.id}>
                {grupo.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {filas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnas.length} className="text-center text-neutral-500">
                  No hay insumos para mostrar con este filtro.
                </TableCell>
              </TableRow>
            ) : (
              tabla.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <InsumoFormDialog
        abierto={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
        insumo={insumoEditando}
        onGuardado={refrescar}
      />

      <HistorialPreciosSheet
        abierto={historialAbierto}
        onOpenChange={setHistorialAbierto}
        insumo={insumoHistorial}
        onGuardado={refrescar}
      />

      <ActualizacionLoteDialog
        abierto={loteAbierto}
        onOpenChange={setLoteAbierto}
        insumoIds={idsSeleccionados}
        onGuardado={() => {
          setSeleccion({});
          refrescar();
        }}
      />
    </div>
  );
}
