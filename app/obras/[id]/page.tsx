import { notFound } from "next/navigation";

import { listarItemsCatalogo } from "@/lib/acciones/catalogo";
import { listarInsumos } from "@/lib/acciones/insumos";
import { listarPresupuesto } from "@/lib/acciones/presupuesto";
import { listarRubros } from "@/lib/acciones/rubros";
import { PresupuestoClient } from "@/components/obras/presupuesto-client";

export const dynamic = "force-dynamic";

export default async function ObraDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const obraId = Number(id);

  const [presupuesto, rubros, itemsCatalogo, insumos] = await Promise.all([
    listarPresupuesto(obraId),
    listarRubros(),
    listarItemsCatalogo(),
    listarInsumos(),
  ]);

  if (!presupuesto) {
    notFound();
  }

  return (
    <PresupuestoClient
      presupuestoInicial={presupuesto}
      rubros={rubros}
      itemsCatalogo={itemsCatalogo}
      insumos={insumos}
    />
  );
}
