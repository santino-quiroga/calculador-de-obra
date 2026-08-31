"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { importarInsumosDesdeExcel, type FilaImportacion } from "@/lib/acciones/importacion";
import { hoyISO } from "@/lib/formato";
import {
  adivinarColumna,
  normalizarTipo,
  parsearFechaAr,
  parsearNumeroAr,
  parsearXlsx,
  type HojaParseada,
} from "@/lib/importacion/parseo-xlsx";

const CAMPOS_OBJETIVO = [
  { clave: "codigo", etiqueta: "Código", pistas: ["codigo", "cod"] },
  { clave: "descripcion", etiqueta: "Descripción", pistas: ["descripcion", "detalle", "producto", "articulo"] },
  { clave: "unidad", etiqueta: "Unidad", pistas: ["unidad", "unid", "um"] },
  { clave: "tipo", etiqueta: "Tipo", pistas: ["tipo"] },
  { clave: "precio", etiqueta: "Precio", pistas: ["precio", "importe", "valor"] },
  { clave: "fechaVigencia", etiqueta: "Fecha de vigencia", pistas: ["fecha"] },
] as const;

type ClaveCampo = (typeof CAMPOS_OBJETIVO)[number]["clave"];
type Mapeo = Record<ClaveCampo, number | null>;

interface FilaProcesada {
  datos: FilaImportacion | null;
  error: string | null;
}

function procesarFilas(
  hoja: HojaParseada,
  mapeo: Mapeo,
  tipoFijo: "material" | "mano_obra" | "equipo",
  fechaFija: string
): FilaProcesada[] {
  return hoja.filas.map((fila) => {
    const obtener = (clave: ClaveCampo) => {
      const indice = mapeo[clave];
      return indice === null ? "" : (fila[indice] ?? "");
    };

    const codigo = obtener("codigo").trim();
    const descripcion = obtener("descripcion").trim();
    const unidad = obtener("unidad").trim();

    const tipoTexto = obtener("tipo").trim();
    const tipo = mapeo.tipo === null ? tipoFijo : normalizarTipo(tipoTexto);

    const precio = parsearNumeroAr(obtener("precio"));

    const fechaTexto = obtener("fechaVigencia").trim();
    const fechaVigencia = mapeo.fechaVigencia === null ? fechaFija : parsearFechaAr(fechaTexto);

    const errores: string[] = [];
    if (!codigo) errores.push("falta código");
    if (!descripcion) errores.push("falta descripción");
    if (!unidad) errores.push("falta unidad");
    if (!tipo) errores.push(`tipo "${tipoTexto}" no reconocido`);
    if (precio === null || precio <= 0) errores.push("precio inválido");
    if (!fechaVigencia) errores.push(`fecha "${fechaTexto}" inválida`);

    if (errores.length > 0) {
      return { datos: null, error: errores.join(", ") };
    }

    return {
      datos: { codigo, descripcion, unidad, tipo: tipo!, precio: precio!, fechaVigencia: fechaVigencia! },
      error: null,
    };
  });
}

export function ImportarExcelTab() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [arrastrando, setArrastrando] = useState(false);
  const [hoja, setHoja] = useState<HojaParseada | null>(null);
  const [mapeo, setMapeo] = useState<Mapeo>({
    codigo: null,
    descripcion: null,
    unidad: null,
    tipo: null,
    precio: null,
    fechaVigencia: null,
  });
  const [tipoFijo, setTipoFijo] = useState<"material" | "mano_obra" | "equipo">("material");
  const [fechaFija, setFechaFija] = useState(hoyISO());
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<Awaited<ReturnType<typeof importarInsumosDesdeExcel>> | null>(
    null
  );

  async function cargarArchivo(archivo: File) {
    try {
      const hojaParseada = await parsearXlsx(archivo);
      if (hojaParseada.filas.length === 0) {
        toast.error("No se encontraron filas con datos en el archivo.");
        return;
      }

      setHoja(hojaParseada);
      setResultado(null);

      const mapeoInicial = {} as Mapeo;
      for (const campo of CAMPOS_OBJETIVO) {
        mapeoInicial[campo.clave] = adivinarColumna(hojaParseada.encabezados, campo.pistas as unknown as string[]);
      }
      setMapeo(mapeoInicial);
    } catch (error) {
      toast.error("No se pudo leer el archivo. ¿Es un .xlsx válido?");
    }
  }

  const filasProcesadas = useMemo(() => {
    if (!hoja) return [];
    return procesarFilas(hoja, mapeo, tipoFijo, fechaFija);
  }, [hoja, mapeo, tipoFijo, fechaFija]);

  const cantidadValidas = filasProcesadas.filter((f) => f.datos !== null).length;
  const cantidadConError = filasProcesadas.length - cantidadValidas;

  async function confirmarImportacion() {
    if (!hoja) return;
    setImportando(true);

    try {
      const filasValidas = filasProcesadas
        .map((f) => f.datos)
        .filter((f): f is FilaImportacion => f !== null);

      const resumen = await importarInsumosDesdeExcel(filasValidas);
      setResultado(resumen);
      toast.success(
        `Importación terminada: ${resumen.creados} insumos nuevos, ${resumen.preciosAgregados} precios agregados.`
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo completar la importación");
    } finally {
      setImportando(false);
    }
  }

  function empezarDeNuevo() {
    setHoja(null);
    setResultado(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (!hoja) {
    return (
      <div>
        <p className="mb-4 text-sm text-neutral-500">
          Arrastrá acá el .xlsx de tu proveedor, o hacé clic para elegirlo. El archivo se lee
          en tu navegador — recién se manda al sistema lo que confirmes al final.
        </p>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            const archivo = e.dataTransfer.files[0];
            if (archivo) cargarArchivo(archivo);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex h-48 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed text-sm transition-colors ${
            arrastrando ? "border-neutral-900 bg-neutral-50" : "border-neutral-300 text-neutral-500"
          }`}
        >
          <p>Soltá el archivo .xlsx acá</p>
          <p className="mt-1 text-xs">o hacé clic para elegirlo</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            if (archivo) cargarArchivo(archivo);
          }}
        />
      </div>
    );
  }

  if (resultado) {
    return (
      <div>
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <p className="font-medium">Importación completa</p>
          <ul className="mt-2 text-sm text-neutral-600">
            <li>{resultado.creados} insumos nuevos creados</li>
            <li>{resultado.preciosAgregados} precios agregados a insumos existentes</li>
            <li>{resultado.errores.length} filas con error</li>
          </ul>
          {resultado.errores.length > 0 && (
            <ul className="mt-2 text-sm text-red-600">
              {resultado.errores.map((e) => (
                <li key={e.fila}>
                  Fila {e.fila}: {e.motivo}
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button className="mt-4" onClick={empezarDeNuevo}>
          Importar otro archivo
        </Button>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-neutral-500">
        Decinos qué columna del archivo corresponde a cada dato. Si el archivo no trae "Tipo"
        o "Fecha de vigencia", elegí un valor fijo para todo el archivo.
      </p>

      <div className="grid grid-cols-2 gap-4 rounded-md border p-4 sm:grid-cols-3">
        {CAMPOS_OBJETIVO.map((campo) => (
          <div key={campo.clave} className="grid gap-1.5">
            <label className="text-sm font-medium">{campo.etiqueta}</label>
            <Select
              value={mapeo[campo.clave] === null ? "ninguna" : String(mapeo[campo.clave])}
              onValueChange={(valor) =>
                setMapeo((anterior) => ({
                  ...anterior,
                  [campo.clave]: valor === "ninguna" ? null : Number(valor),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ninguna">No aplica</SelectItem>
                {hoja.encabezados.map((encabezado, indice) => (
                  <SelectItem key={indice} value={String(indice)}>
                    {encabezado || `Columna ${indice + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {mapeo.tipo === null && (
        <div className="mt-4 grid max-w-xs gap-1.5">
          <label className="text-sm font-medium">
            Tipo para todo el archivo (no hay columna mapeada)
          </label>
          <Select value={tipoFijo} onValueChange={(v) => setTipoFijo(v as typeof tipoFijo)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="material">Material</SelectItem>
              <SelectItem value="mano_obra">Mano de obra</SelectItem>
              <SelectItem value="equipo">Equipo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {mapeo.fechaVigencia === null && (
        <div className="mt-4 grid max-w-xs gap-1.5">
          <label className="text-sm font-medium">
            Fecha de vigencia para todo el archivo (no hay columna mapeada)
          </label>
          <input
            type="date"
            value={fechaFija}
            onChange={(e) => setFechaFija(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          />
        </div>
      )}

      <div className="mt-6 flex items-center gap-3 text-sm">
        <Badge variant="outline">{cantidadValidas} filas listas</Badge>
        {cantidadConError > 0 && <Badge variant="destructive">{cantidadConError} con error</Badge>}
      </div>

      <div className="mt-3 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Vigencia</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filasProcesadas.slice(0, 10).map((fila, indice) => (
              <TableRow key={indice}>
                {fila.datos ? (
                  <>
                    <TableCell>{fila.datos.codigo}</TableCell>
                    <TableCell>{fila.datos.descripcion}</TableCell>
                    <TableCell>{fila.datos.unidad}</TableCell>
                    <TableCell>{fila.datos.tipo}</TableCell>
                    <TableCell>{fila.datos.precio}</TableCell>
                    <TableCell>{fila.datos.fechaVigencia}</TableCell>
                    <TableCell>
                      <Badge variant="outline">OK</Badge>
                    </TableCell>
                  </>
                ) : (
                  <TableCell colSpan={7} className="text-red-600">
                    Fila {indice + 1}: {fila.error}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filasProcesadas.length > 10 && (
          <p className="border-t p-2 text-center text-xs text-neutral-500">
            Mostrando las primeras 10 de {filasProcesadas.length} filas.
          </p>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={empezarDeNuevo}>
          Cancelar
        </Button>
        <Button disabled={cantidadValidas === 0 || importando} onClick={confirmarImportacion}>
          {importando ? "Importando..." : `Confirmar importación (${cantidadValidas})`}
        </Button>
      </div>
    </div>
  );
}
