import { listarInsumos } from "@/lib/acciones/insumos";
import { listarRubros } from "@/lib/acciones/rubros";
import { listarConceptosCargaSocial } from "@/lib/acciones/cargas-sociales";
import { obtenerParametrosEmpresa } from "@/lib/acciones/parametros-empresa";
import { BasesMaestrasClient } from "@/components/bases-maestras/bases-maestras-client";

// Lee siempre de la base en vivo: nunca se puede prerenderizar en el build,
// porque los datos cambian con cada alta/edición.
export const dynamic = "force-dynamic";

export default async function BasesMaestras() {
  const [insumos, rubros, conceptos, parametros] = await Promise.all([
    listarInsumos(),
    listarRubros(),
    listarConceptosCargaSocial(),
    obtenerParametrosEmpresa(),
  ]);

  return (
    <BasesMaestrasClient
      insumosIniciales={insumos}
      rubrosIniciales={rubros}
      conceptosIniciales={conceptos}
      parametrosIniciales={parametros}
    />
  );
}
