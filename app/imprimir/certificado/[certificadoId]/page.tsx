import { notFound } from "next/navigation";

import { Caratula } from "@/components/impresion/caratula";
import { BotonImprimir } from "@/components/impresion/boton-imprimir";
import { obtenerCertificadoParaImprimir } from "@/lib/acciones/certificados";
import { obtenerParametrosEmpresa } from "@/lib/acciones/parametros-empresa";
import { formatearMoneda } from "@/lib/formato";

export const dynamic = "force-dynamic";

const ETIQUETAS_ESTADO: Record<string, string> = {
  borrador: "Borrador",
  emitido: "Emitido",
  aprobado: "Aprobado",
};

export default async function ImprimirCertificado({ params }: { params: Promise<{ certificadoId: string }> }) {
  const { certificadoId } = await params;
  const [resuelto, empresa] = await Promise.all([
    obtenerCertificadoParaImprimir(Number(certificadoId)),
    obtenerParametrosEmpresa(),
  ]);
  if (!resuelto) notFound();

  const { certificado, obra } = resuelto;

  return (
    <div className="mx-auto max-w-2xl text-sm">
      <div className="mb-4 flex justify-end">
        <BotonImprimir />
      </div>

      <Caratula titulo={`Certificado N.º ${certificado.numero}`} obra={obra} empresa={empresa} />

      <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <p>
          <span className="font-medium">Período:</span> {certificado.periodo}
        </p>
        <p>
          <span className="font-medium">Estado:</span> {ETIQUETAS_ESTADO[certificado.estado]}
        </p>
      </div>

      <table className="w-full border-collapse text-sm">
        <tbody>
          <Fila etiqueta="Certificado anterior (acumulado bruto)" valor={formatearMoneda(certificado.acumuladoBrutoAnterior)} />
          <Fila etiqueta="Monto bruto del período" valor={formatearMoneda(certificado.montoBruto)} />
          <Fila etiqueta="Acumulado bruto a la fecha" valor={formatearMoneda(certificado.acumuladoBrutoActual)} destacado />
          <Fila etiqueta={`Descuento anticipo financiero (${obra.anticipoPct ?? 0}%)`} valor={`- ${formatearMoneda(certificado.descAnticipo)}`} />
          <Fila etiqueta={`Descuento fondo de reparo (${obra.fondoReparoPct ?? 0}%)`} valor={`- ${formatearMoneda(certificado.descFondoReparo)}`} />
          <Fila etiqueta="Monto neto a pagar" valor={formatearMoneda(certificado.montoNeto)} destacado />
        </tbody>
      </table>

      <div className="mt-16 grid grid-cols-2 gap-8 text-center text-xs">
        <div className="border-t border-neutral-900 pt-1">Firma comitente</div>
        <div className="border-t border-neutral-900 pt-1">Firma contratista</div>
      </div>
    </div>
  );
}

function Fila({ etiqueta, valor, destacado }: { etiqueta: string; valor: string; destacado?: boolean }) {
  return (
    <tr className={destacado ? "border-t-2 border-neutral-900 font-bold" : "border-b border-neutral-100"}>
      <td className="py-1.5 pr-2">{etiqueta}</td>
      <td className="py-1.5 text-right">{valor}</td>
    </tr>
  );
}
