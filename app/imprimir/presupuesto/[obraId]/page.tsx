import { Fragment } from "react";
import { notFound } from "next/navigation";

import { Caratula } from "@/components/impresion/caratula";
import { BotonImprimir } from "@/components/impresion/boton-imprimir";
import { listarPresupuesto } from "@/lib/acciones/presupuesto";
import { obtenerParametrosEmpresa } from "@/lib/acciones/parametros-empresa";
import { formatearMoneda } from "@/lib/formato";

export const dynamic = "force-dynamic";

export default async function ImprimirPresupuesto({ params }: { params: Promise<{ obraId: string }> }) {
  const { obraId } = await params;
  const [presupuesto, empresa] = await Promise.all([
    listarPresupuesto(Number(obraId)),
    obtenerParametrosEmpresa(),
  ]);
  if (!presupuesto) notFound();

  return (
    <div className="mx-auto max-w-4xl text-sm">
      <div className="mb-4 flex justify-end">
        <BotonImprimir />
      </div>

      <Caratula titulo="Cómputo y presupuesto" obra={presupuesto.obra} empresa={empresa} />

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b-2 border-neutral-900 text-left">
            <th className="py-1 pr-2">Ítem</th>
            <th className="py-1 pr-2">Descripción</th>
            <th className="py-1 pr-2 text-right">Unid.</th>
            <th className="py-1 pr-2 text-right">Cant.</th>
            <th className="py-1 pr-2 text-right">Precio unit.</th>
            <th className="py-1 pr-2 text-right">Precio total</th>
            <th className="py-1 pr-2 text-right">Subtotal ítem</th>
            <th className="py-1 text-right">Inc. %</th>
          </tr>
        </thead>
        <tbody>
          {presupuesto.rubros.map((rubro) => (
            <Fragment key={rubro.rubroId}>
              <tr className="border-b border-neutral-300 font-semibold">
                <td className="py-1 pr-2">{rubro.nroRubro}</td>
                <td className="py-1 pr-2 uppercase" colSpan={4}>
                  {rubro.nombre}
                </td>
                <td />
                <td className="py-1 pr-2 text-right">{formatearMoneda(rubro.subtotal)}</td>
                <td className="py-1 text-right">{rubro.incidenciaPct.toFixed(2)}%</td>
              </tr>
              {rubro.items.map((item) => (
                <tr key={item.id} className="border-b border-neutral-100">
                  <td className="py-1 pr-2">{item.nroItem}</td>
                  <td className="py-1 pr-2">{item.descripcion}</td>
                  <td className="py-1 pr-2 text-right">{item.unidad}</td>
                  <td className="py-1 pr-2 text-right">{item.cantidad.toFixed(2)}</td>
                  <td className="py-1 pr-2 text-right">{formatearMoneda(item.precioUnitario)}</td>
                  <td className="py-1 pr-2 text-right">{formatearMoneda(item.precioTotal)}</td>
                  <td />
                  <td />
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-neutral-900 font-bold">
            <td className="py-1 pr-2" colSpan={6}>
              TOTAL
            </td>
            <td className="py-1 pr-2 text-right">{formatearMoneda(presupuesto.totalPresupuesto)}</td>
            <td className="py-1 text-right">100,00%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
