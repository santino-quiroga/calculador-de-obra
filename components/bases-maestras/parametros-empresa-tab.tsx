"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { guardarParametrosEmpresa } from "@/lib/acciones/parametros-empresa";
import type { ParametrosEmpresaFila } from "./bases-maestras-client";

const CAMPOS: { clave: keyof CamposFormulario; etiqueta: string }[] = [
  { clave: "gastosGeneralesPct", etiqueta: "Gastos generales (%)" },
  { clave: "beneficioPct", etiqueta: "Beneficio (%)" },
  { clave: "gastosFinancierosPct", etiqueta: "Gastos financieros (%)" },
  { clave: "segurosPct", etiqueta: "Seguros (%)" },
  { clave: "ivaPct", etiqueta: "IVA (%)" },
  { clave: "ingresosBrutosPct", etiqueta: "Ingresos brutos — IIBB (%)" },
  { clave: "selladoPct", etiqueta: "Sellado (%)" },
];

const CAMPOS_CARATULA: { clave: keyof CamposCaratula; etiqueta: string }[] = [
  { clave: "razonSocial", etiqueta: "Razón social / estudio" },
  { clave: "cuit", etiqueta: "CUIT" },
  { clave: "direccion", etiqueta: "Dirección" },
  { clave: "matricula", etiqueta: "Matrícula" },
];

type CamposFormulario = {
  gastosGeneralesPct: string;
  beneficioPct: string;
  ingresosBrutosPct: string;
  ivaPct: string;
  selladoPct: string;
  gastosFinancierosPct: string;
  segurosPct: string;
};

type CamposCaratula = {
  razonSocial: string;
  cuit: string;
  direccion: string;
  matricula: string;
};

function valoresIniciales(parametros: ParametrosEmpresaFila): CamposFormulario {
  return {
    gastosGeneralesPct: String(parametros?.gastosGeneralesPct ?? ""),
    beneficioPct: String(parametros?.beneficioPct ?? ""),
    ingresosBrutosPct: String(parametros?.ingresosBrutosPct ?? ""),
    ivaPct: String(parametros?.ivaPct ?? ""),
    selladoPct: String(parametros?.selladoPct ?? ""),
    gastosFinancierosPct: String(parametros?.gastosFinancierosPct ?? ""),
    segurosPct: String(parametros?.segurosPct ?? ""),
  };
}

function valoresInicialesCaratula(parametros: ParametrosEmpresaFila): CamposCaratula {
  return {
    razonSocial: parametros?.razonSocial ?? "",
    cuit: parametros?.cuit ?? "",
    direccion: parametros?.direccion ?? "",
    matricula: parametros?.matricula ?? "",
  };
}

export function ParametrosEmpresaTab({
  parametrosIniciales,
}: {
  parametrosIniciales: ParametrosEmpresaFila;
}) {
  const router = useRouter();
  const [valores, setValores] = useState<CamposFormulario>(() => valoresIniciales(parametrosIniciales));
  const [caratula, setCaratula] = useState<CamposCaratula>(() => valoresInicialesCaratula(parametrosIniciales));
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setValores(valoresIniciales(parametrosIniciales));
    setCaratula(valoresInicialesCaratula(parametrosIniciales));
  }, [parametrosIniciales]);

  async function manejarSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);

    try {
      await guardarParametrosEmpresa({
        gastosGeneralesPct: Number(valores.gastosGeneralesPct),
        beneficioPct: Number(valores.beneficioPct),
        ingresosBrutosPct: Number(valores.ingresosBrutosPct),
        ivaPct: Number(valores.ivaPct),
        selladoPct: Number(valores.selladoPct),
        gastosFinancierosPct: Number(valores.gastosFinancierosPct),
        segurosPct: Number(valores.segurosPct),
        ...caratula,
      });
      toast.success("Parámetros de empresa guardados");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron guardar los parámetros");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={manejarSubmit} className="max-w-xl">
      <p className="mb-4 text-sm text-neutral-500">
        Estos son los porcentajes por defecto que arma el coeficiente resumen (CLAUDE.md,
        sección 6.2). Cada obra puede tener sus propios valores; esto es el punto de partida.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {CAMPOS.map(({ clave, etiqueta }) => (
          <div key={clave} className="grid gap-1.5">
            <Label htmlFor={clave}>{etiqueta}</Label>
            <Input
              id={clave}
              type="number"
              step="0.01"
              required
              value={valores[clave]}
              onChange={(e) => setValores((anterior) => ({ ...anterior, [clave]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <p className="mb-4 mt-8 text-sm text-neutral-500">
        Datos para la carátula de las exportaciones e impresiones (presupuesto, APUs y
        certificados).
      </p>
      <div className="grid grid-cols-2 gap-4">
        {CAMPOS_CARATULA.map(({ clave, etiqueta }) => (
          <div key={clave} className="grid gap-1.5">
            <Label htmlFor={clave}>{etiqueta}</Label>
            <Input
              id={clave}
              value={caratula[clave]}
              onChange={(e) => setCaratula((anterior) => ({ ...anterior, [clave]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <Button type="submit" disabled={guardando} className="mt-6">
        {guardando ? "Guardando..." : "Guardar parámetros"}
      </Button>
    </form>
  );
}
