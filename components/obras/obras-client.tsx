"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { listarObras } from "@/lib/acciones/obras";
import { formatearFecha } from "@/lib/formato";
import { ObraFormDialog } from "./obra-form-dialog";

export type ObraFila = Awaited<ReturnType<typeof listarObras>>[number];

const ETIQUETAS_ESTADO: Record<string, string> = {
  borrador: "Borrador",
  presentado: "Presentado",
  en_ejecucion: "En ejecución",
  cerrada: "Cerrada",
};

export function ObrasClient({ obrasIniciales }: { obrasIniciales: ObraFila[] }) {
  const router = useRouter();
  const [obras, setObras] = useState(obrasIniciales);
  useEffect(() => setObras(obrasIniciales), [obrasIniciales]);

  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [obraEditando, setObraEditando] = useState<ObraFila | null>(null);

  function refrescar() {
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Obras y presupuesto</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Cada obra tiene su propia fecha base de precios. Abrila para cargar el presupuesto.
          </p>
        </div>
        <Button
          onClick={() => {
            setObraEditando(null);
            setDialogoAbierto(true);
          }}
        >
          Nueva obra
        </Button>
      </div>

      <div className="mt-6 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Comitente</TableHead>
              <TableHead>Fecha base de precios</TableHead>
              <TableHead>Licitación</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {obras.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-neutral-500">
                  Todavía no hay obras cargadas.
                </TableCell>
              </TableRow>
            ) : (
              obras.map((obra) => (
                <TableRow key={obra.id}>
                  <TableCell>
                    <Link href={`/obras/${obra.id}`} className="font-medium hover:underline">
                      {obra.nombre}
                    </Link>
                  </TableCell>
                  <TableCell>{obra.comitente ?? "—"}</TableCell>
                  <TableCell>{formatearFecha(obra.fechaBasePrecios)}</TableCell>
                  <TableCell>
                    {obra.tipoLicitacion === "publica"
                      ? "Pública"
                      : obra.tipoLicitacion === "privada"
                        ? "Privada"
                        : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{ETIQUETAS_ESTADO[obra.estado]}</Badge>
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Link href={`/obras/${obra.id}`}>
                      <Button variant="ghost" size="sm">
                        Abrir presupuesto
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setObraEditando(obra);
                        setDialogoAbierto(true);
                      }}
                    >
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ObraFormDialog
        abierto={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
        obra={obraEditando}
        onGuardado={refrescar}
      />
    </div>
  );
}
