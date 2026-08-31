"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { listarItemsCatalogo } from "@/lib/acciones/catalogo";
import { cambiarActivoItemCatalogo } from "@/lib/acciones/catalogo";
import type { listarInsumos } from "@/lib/acciones/insumos";
import type { listarRubros } from "@/lib/acciones/rubros";
import { ApuEditorSheet } from "./apu-editor-sheet";
import { ItemCatalogoFormDialog } from "./item-catalogo-form-dialog";

export type ItemCatalogoFila = Awaited<ReturnType<typeof listarItemsCatalogo>>[number];
export type InsumoParaCatalogo = Awaited<ReturnType<typeof listarInsumos>>[number];
export type RubroParaCatalogo = Awaited<ReturnType<typeof listarRubros>>[number];

export function CatalogoClient({
  itemsIniciales,
  rubros,
  insumos,
}: {
  itemsIniciales: ItemCatalogoFila[];
  rubros: RubroParaCatalogo[];
  insumos: InsumoParaCatalogo[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(itemsIniciales);
  useEffect(() => setItems(itemsIniciales), [itemsIniciales]);

  const [filtroRubroId, setFiltroRubroId] = useState("todos");
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [itemEditando, setItemEditando] = useState<ItemCatalogoFila | null>(null);
  const [itemAbiertoId, setItemAbiertoId] = useState<number | null>(null);

  function refrescar() {
    router.refresh();
  }

  const filas = items.filter((item) => {
    if (!mostrarInactivos && !item.activo) return false;
    if (filtroRubroId !== "todos" && String(item.rubroId) !== filtroRubroId) return false;
    return true;
  });

  async function manejarCambiarActivo(item: ItemCatalogoFila) {
    try {
      await cambiarActivoItemCatalogo(item.id, !item.activo);
      toast.success(item.activo ? "Ítem desactivado" : "Ítem reactivado");
      refrescar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar el estado");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Catálogo de ítems</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Las recetas de APU reutilizables entre obras. Abrí un ítem para ver y editar su
        composición — el costo se calcula siempre contra la lista de precios vigente.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Select value={filtroRubroId} onValueChange={setFiltroRubroId}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los rubros</SelectItem>
            {rubros.map((rubro) => (
              <SelectItem key={rubro.id} value={String(rubro.id)}>
                {rubro.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={mostrarInactivos}
            onChange={(e) => setMostrarInactivos(e.target.checked)}
          />
          Mostrar inactivos
        </label>

        <Button
          className="ml-auto"
          onClick={() => {
            setItemEditando(null);
            setDialogoAbierto(true);
          }}
        >
          Nuevo ítem
        </Button>
      </div>

      <div className="mt-4 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Rubro</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-neutral-500">
                  No hay ítems de catálogo con este filtro.
                </TableCell>
              </TableRow>
            ) : (
              filas.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.codigo}</TableCell>
                  <TableCell>{item.rubroNombre}</TableCell>
                  <TableCell>
                    <button className="text-left hover:underline" onClick={() => setItemAbiertoId(item.id)}>
                      {item.descripcion}
                    </button>
                  </TableCell>
                  <TableCell>{item.unidad}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.origen === "sistema" ? "Sistema" : "Usuario"}</Badge>
                  </TableCell>
                  <TableCell>
                    {item.activo ? (
                      <Badge variant="outline">Activo</Badge>
                    ) : (
                      <Badge variant="destructive">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setItemAbiertoId(item.id)}>
                      Abrir APU
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setItemEditando(item);
                        setDialogoAbierto(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => manejarCambiarActivo(item)}>
                      {item.activo ? "Desactivar" : "Reactivar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ItemCatalogoFormDialog
        abierto={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
        item={itemEditando}
        rubros={rubros}
        onGuardado={refrescar}
      />

      <ApuEditorSheet
        itemId={itemAbiertoId}
        onOpenChange={(abierto) => !abierto && setItemAbiertoId(null)}
        insumos={insumos}
        onCambio={refrescar}
      />
    </div>
  );
}
