"use client";

import type { listarInsumos } from "@/lib/acciones/insumos";
import type { listarRubros } from "@/lib/acciones/rubros";
import type { listarConceptosCargaSocial } from "@/lib/acciones/cargas-sociales";
import type { obtenerParametrosEmpresa } from "@/lib/acciones/parametros-empresa";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InsumosTab } from "./insumos-tab";
import { RubrosTab } from "./rubros-tab";
import { CargasSocialesTab } from "./cargas-sociales-tab";
import { ParametrosEmpresaTab } from "./parametros-empresa-tab";
import { ImportarExcelTab } from "./importar-excel-tab";

export type InsumoFila = Awaited<ReturnType<typeof listarInsumos>>[number];
export type RubroFila = Awaited<ReturnType<typeof listarRubros>>[number];
export type ConceptoCargaSocialFila = Awaited<ReturnType<typeof listarConceptosCargaSocial>>[number];
export type ParametrosEmpresaFila = Awaited<ReturnType<typeof obtenerParametrosEmpresa>>;

export function BasesMaestrasClient({
  insumosIniciales,
  rubrosIniciales,
  conceptosIniciales,
  parametrosIniciales,
}: {
  insumosIniciales: InsumoFila[];
  rubrosIniciales: RubroFila[];
  conceptosIniciales: ConceptoCargaSocialFila[];
  parametrosIniciales: ParametrosEmpresaFila;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Bases maestras</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Tu lista de precios de insumos, los rubros, las cargas sociales y los parámetros
        generales de la empresa. Todo lo que usan el resto de las pantallas sale de acá.
      </p>

      <Tabs defaultValue="insumos" className="mt-6">
        <TabsList>
          <TabsTrigger value="insumos">Insumos</TabsTrigger>
          <TabsTrigger value="rubros">Rubros</TabsTrigger>
          <TabsTrigger value="cargas-sociales">Cargas sociales</TabsTrigger>
          <TabsTrigger value="parametros">Parámetros de empresa</TabsTrigger>
          <TabsTrigger value="importar">Importar desde Excel</TabsTrigger>
        </TabsList>

        <TabsContent value="insumos">
          <InsumosTab insumosIniciales={insumosIniciales} />
        </TabsContent>
        <TabsContent value="rubros">
          <RubrosTab rubrosIniciales={rubrosIniciales} />
        </TabsContent>
        <TabsContent value="cargas-sociales">
          <CargasSocialesTab conceptosIniciales={conceptosIniciales} />
        </TabsContent>
        <TabsContent value="parametros">
          <ParametrosEmpresaTab parametrosIniciales={parametrosIniciales} />
        </TabsContent>
        <TabsContent value="importar">
          <ImportarExcelTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
