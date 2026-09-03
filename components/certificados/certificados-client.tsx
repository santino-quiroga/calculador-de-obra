"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ObraFila } from "@/components/obras/obras-client";
import {
  cambiarEstadoCertificado,
  eliminarCertificado,
  generarCertificado,
  listarCertificados,
  listarPeriodosCertificables,
} from "@/lib/acciones/certificados";
import { formatearMoneda } from "@/lib/formato";

type Certificados = Awaited<ReturnType<typeof listarCertificados>>;

const ETIQUETAS_ESTADO: Record<string, string> = {
  borrador: "Borrador",
  emitido: "Emitido",
  aprobado: "Aprobado",
};

const SIGUIENTE_ESTADO: Record<string, string | null> = {
  borrador: "emitido",
  emitido: "aprobado",
  aprobado: null,
};

export function CertificadosClient({ obras }: { obras: ObraFila[] }) {
  const router = useRouter();
  const [obraId, setObraId] = useState("");
  const [datos, setDatos] = useState<Certificados>(null);
  const [periodosDisponibles, setPeriodosDisponibles] = useState<string[]>([]);
  const [periodoElegido, setPeriodoElegido] = useState("");
  const [cargando, setCargando] = useState(false);
  const [generando, setGenerando] = useState(false);

  async function cargar(idObra: string) {
    if (idObra === "") {
      setDatos(null);
      setPeriodosDisponibles([]);
      return;
    }
    setCargando(true);
    try {
      const [certificados, periodos] = await Promise.all([
        listarCertificados(Number(idObra)),
        listarPeriodosCertificables(Number(idObra)),
      ]);
      setDatos(certificados);
      setPeriodosDisponibles(periodos);
      setPeriodoElegido(periodos[0] ?? "");
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

  async function manejarGenerar() {
    if (!periodoElegido) return;
    setGenerando(true);
    try {
      await generarCertificado(Number(obraId), { periodo: periodoElegido });
      toast.success(`Certificado de ${periodoElegido} generado`);
      refrescar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar el certificado");
    } finally {
      setGenerando(false);
    }
  }

  async function manejarAvanzarEstado(id: number, estadoActual: string) {
    const siguiente = SIGUIENTE_ESTADO[estadoActual];
    if (!siguiente) return;
    try {
      await cambiarEstadoCertificado(id, { estado: siguiente });
      toast.success(`Certificado marcado como ${ETIQUETAS_ESTADO[siguiente]}`);
      refrescar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar el estado");
    }
  }

  async function manejarEliminar(id: number) {
    try {
      await eliminarCertificado(id);
      toast.success("Certificado eliminado");
      refrescar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el certificado");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Certificados</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Un certificado se genera a partir de los avances que ya cargaste en Control de obra —
        no se carga nada a mano acá.
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

      {cargando && <p className="mt-6 text-sm text-neutral-500">Cargando...</p>}

      {datos && (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap items-end gap-4 rounded-md border p-4">
            <div className="grid gap-1.5">
              <Label>Mes a certificar</Label>
              <Select value={periodoElegido} onValueChange={setPeriodoElegido}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Elegí un mes" />
                </SelectTrigger>
                <SelectContent>
                  {periodosDisponibles.map((periodo) => (
                    <SelectItem key={periodo} value={periodo}>
                      {periodo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={manejarGenerar} disabled={!periodoElegido || generando}>
              {generando ? "Generando..." : "Generar certificado"}
            </Button>
            {periodosDisponibles.length === 0 && (
              <p className="max-w-sm text-xs text-neutral-500">
                No hay meses pendientes de certificar — cargá avances en Control de obra o ya
                certificaste todos los que tienen datos.
              </p>
            )}
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N.º</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Bruto</TableHead>
                  <TableHead>Anticipo</TableHead>
                  <TableHead>Fondo de reparo</TableHead>
                  <TableHead>Neto</TableHead>
                  <TableHead>Acumulado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {datos.certificados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-neutral-500">
                      Todavía no se generó ningún certificado.
                    </TableCell>
                  </TableRow>
                ) : (
                  datos.certificados.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.numero}</TableCell>
                      <TableCell>{c.periodo}</TableCell>
                      <TableCell>{formatearMoneda(c.montoBruto)}</TableCell>
                      <TableCell>{formatearMoneda(c.descAnticipo)}</TableCell>
                      <TableCell>{formatearMoneda(c.descFondoReparo)}</TableCell>
                      <TableCell className="font-medium">{formatearMoneda(c.montoNeto)}</TableCell>
                      <TableCell>{formatearMoneda(c.acumuladoBrutoActual)}</TableCell>
                      <TableCell>
                        <Badge variant={c.estado === "aprobado" ? "default" : "secondary"}>
                          {ETIQUETAS_ESTADO[c.estado]}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-x-2 whitespace-nowrap text-right">
                        <a
                          className="text-xs text-blue-600 hover:underline"
                          href={`/imprimir/certificado/${c.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Imprimir
                        </a>
                        {SIGUIENTE_ESTADO[c.estado] && (
                          <button
                            className="text-xs text-blue-600 hover:underline"
                            onClick={() => manejarAvanzarEstado(c.id, c.estado)}
                          >
                            Marcar {ETIQUETAS_ESTADO[SIGUIENTE_ESTADO[c.estado]!]}
                          </button>
                        )}
                        {c.estado === "borrador" && (
                          <button
                            className="text-xs text-red-600 hover:underline"
                            onClick={() => manejarEliminar(c.id)}
                          >
                            Eliminar
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
