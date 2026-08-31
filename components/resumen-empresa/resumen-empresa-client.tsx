"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ObraFila } from "@/components/obras/obras-client";
import { guardarParametrosEmpresa } from "@/lib/acciones/parametros-empresa";
import { obtenerResumenObra } from "@/lib/acciones/resumen-empresa";
import { calcularCoeficienteResumen, type ParametrosCoeficiente } from "@/lib/calculo/coeficiente-resumen";
import { desagregarCoeficiente, resolverBeneficioParaPrecioObjetivo } from "@/lib/calculo/resumen-empresa";
import { formatearMoneda } from "@/lib/formato";
import { ComposicionPieChart } from "./composicion-pie-chart";

type ResumenObra = Awaited<ReturnType<typeof obtenerResumenObra>>;

const CAMPOS: { clave: keyof ParametrosCoeficiente; etiqueta: string }[] = [
  { clave: "gastosGeneralesPct", etiqueta: "Gastos generales (%)" },
  { clave: "segurosPct", etiqueta: "Seguros (%)" },
  { clave: "gastosFinancierosPct", etiqueta: "Gastos financieros (%)" },
  { clave: "ivaPct", etiqueta: "IVA (%)" },
  { clave: "ingresosBrutosPct", etiqueta: "Ingresos brutos — IIBB (%)" },
  { clave: "selladoPct", etiqueta: "Sellado (%)" },
];

function aParametros(valores: Record<keyof ParametrosCoeficiente, string>): ParametrosCoeficiente {
  return {
    gastosGeneralesPct: Number(valores.gastosGeneralesPct) || 0,
    beneficioPct: Number(valores.beneficioPct) || 0,
    ingresosBrutosPct: Number(valores.ingresosBrutosPct) || 0,
    ivaPct: Number(valores.ivaPct) || 0,
    selladoPct: Number(valores.selladoPct) || 0,
    gastosFinancierosPct: Number(valores.gastosFinancierosPct) || 0,
    segurosPct: Number(valores.segurosPct) || 0,
  };
}

export function ResumenEmpresaClient({ obras }: { obras: ObraFila[] }) {
  const [obraId, setObraId] = useState("");
  const [resumen, setResumen] = useState<ResumenObra>(null);
  const [cargando, setCargando] = useState(false);

  const [valores, setValores] = useState<Record<keyof ParametrosCoeficiente, string>>({
    gastosGeneralesPct: "0",
    beneficioPct: "0",
    ingresosBrutosPct: "0",
    ivaPct: "0",
    selladoPct: "0",
    gastosFinancierosPct: "0",
    segurosPct: "0",
  });
  const [modo, setModo] = useState<"normal" | "objetivo">("normal");
  const [precioObjetivo, setPrecioObjetivo] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (obraId === "") {
      setResumen(null);
      return;
    }
    setCargando(true);
    obtenerResumenObra(Number(obraId))
      .then((resultado) => {
        setResumen(resultado);
        if (resultado) {
          setValores({
            gastosGeneralesPct: String(resultado.parametrosPorDefecto.gastosGeneralesPct),
            beneficioPct: String(resultado.parametrosPorDefecto.beneficioPct),
            ingresosBrutosPct: String(resultado.parametrosPorDefecto.ingresosBrutosPct),
            ivaPct: String(resultado.parametrosPorDefecto.ivaPct),
            selladoPct: String(resultado.parametrosPorDefecto.selladoPct),
            gastosFinancierosPct: String(resultado.parametrosPorDefecto.gastosFinancierosPct),
            segurosPct: String(resultado.parametrosPorDefecto.segurosPct),
          });
          setPrecioObjetivo("");
          setModo("normal");
        }
      })
      .finally(() => setCargando(false));
  }, [obraId]);

  const costoDirecto = resumen?.composicion.costoDirecto ?? 0;

  const { parametrosEfectivos, beneficioCalculado } = useMemo(() => {
    const base = aParametros(valores);

    if (modo === "normal") {
      return { parametrosEfectivos: base, beneficioCalculado: null as number | null };
    }

    const { beneficioPct: _ignorado, ...sinBeneficio } = base;
    const beneficio = resolverBeneficioParaPrecioObjetivo(costoDirecto, Number(precioObjetivo) || 0, sinBeneficio);

    return {
      parametrosEfectivos: { ...base, beneficioPct: beneficio ?? 0 },
      beneficioCalculado: beneficio,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valores, modo, precioObjetivo, costoDirecto]);

  const coeficiente = useMemo(
    () => calcularCoeficienteResumen(costoDirecto, parametrosEfectivos),
    [costoDirecto, parametrosEfectivos]
  );
  const desagregado = useMemo(
    () => desagregarCoeficiente(coeficiente, parametrosEfectivos),
    [coeficiente, parametrosEfectivos]
  );

  async function manejarGuardarParametros() {
    setGuardando(true);
    try {
      await guardarParametrosEmpresa(parametrosEfectivos);
      toast.success("Parámetros de empresa actualizados — vale para todas las obras");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Resumen de empresa</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Consolida el presupuesto de una obra: costo directo, cargas sociales, y la cascada
        completa hasta el precio de venta. Tanteá porcentajes sin miedo — no se guarda nada
        hasta que lo pidas.
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

      {resumen && (
        <div className="mt-6 space-y-6">
          {resumen.tieneErrores && (
            <p className="text-sm text-red-600">
              Ojo: algún ítem del presupuesto tiene un insumo sin precio vigente a la fecha
              base — el costo directo de acá puede estar incompleto.
            </p>
          )}

          <div className="rounded-md border p-4">
            <p className="text-sm text-neutral-500">Costo directo</p>
            <p className="text-2xl font-semibold">{formatearMoneda(resumen.composicion.costoDirecto)}</p>
            <p className="mt-1 text-xs text-neutral-500">
              De los cuales, aporte por cargas sociales:{" "}
              {formatearMoneda(resumen.composicion.aporteCargasSociales)}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="rounded-md border p-3">
                <p className="text-neutral-500">Materiales</p>
                <p className="text-lg font-semibold">{formatearMoneda(resumen.composicion.materiales)}</p>
                <p className="text-xs text-neutral-500">{resumen.composicion.materialesPct.toFixed(1)}%</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-neutral-500">Mano de obra</p>
                <p className="text-lg font-semibold">{formatearMoneda(resumen.composicion.manoObraConCargas)}</p>
                <p className="text-xs text-neutral-500">{resumen.composicion.manoObraPct.toFixed(1)}%</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-neutral-500">Equipos</p>
                <p className="text-lg font-semibold">{formatearMoneda(resumen.composicion.equipos)}</p>
                <p className="text-xs text-neutral-500">{resumen.composicion.equiposPct.toFixed(1)}%</p>
              </div>
            </div>
            <ComposicionPieChart
              materiales={resumen.composicion.materiales}
              manoObra={resumen.composicion.manoObraConCargas}
              equipos={resumen.composicion.equipos}
            />
          </div>

          <div>
            <Tabs value={modo} onValueChange={(v) => setModo(v as "normal" | "objetivo")}>
              <TabsList>
                <TabsTrigger value="normal">Editar beneficio</TabsTrigger>
                <TabsTrigger value="objetivo">Objetivo de precio</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {modo === "normal" ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="beneficioPct">Beneficio (%)</Label>
                  <Input
                    id="beneficioPct"
                    type="number"
                    step="0.01"
                    value={valores.beneficioPct}
                    onChange={(e) => setValores((v) => ({ ...v, beneficioPct: e.target.value }))}
                  />
                </div>
              ) : (
                <>
                  <div className="grid gap-1.5">
                    <Label htmlFor="precioObjetivo">Precio objetivo</Label>
                    <Input
                      id="precioObjetivo"
                      type="number"
                      step="0.01"
                      value={precioObjetivo}
                      onChange={(e) => setPrecioObjetivo(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Beneficio resultante</Label>
                    <Input
                      readOnly
                      value={beneficioCalculado === null ? "—" : `${beneficioCalculado.toFixed(2)}%`}
                      className="bg-neutral-50"
                    />
                  </div>
                </>
              )}

              {CAMPOS.map(({ clave, etiqueta }) => (
                <div key={clave} className="grid gap-1.5">
                  <Label htmlFor={clave}>{etiqueta}</Label>
                  <Input
                    id={clave}
                    type="number"
                    step="0.01"
                    value={valores[clave]}
                    onChange={(e) => setValores((v) => ({ ...v, [clave]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">Cascada desagregada</p>
            <Table className="mt-2">
              <TableHeader>
                <TableRow>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Costo directo</TableCell>
                  <TableCell>{formatearMoneda(coeficiente.costoDirecto)}</TableCell>
                </TableRow>
                {desagregado.map((linea) => (
                  <TableRow key={linea.concepto}>
                    <TableCell>{linea.concepto}</TableCell>
                    <TableCell>{formatearMoneda(linea.monto)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold">
                  <TableCell>Precio final</TableCell>
                  <TableCell>{formatearMoneda(coeficiente.precioFinal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between rounded-md border border-neutral-900 bg-neutral-50 p-4">
            <div>
              <p className="text-sm text-neutral-500">Coeficiente resumen (k)</p>
              <p className="text-2xl font-semibold">{coeficiente.coeficienteK.toFixed(4)}</p>
            </div>
            <Button onClick={manejarGuardarParametros} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar como parámetros de empresa"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
