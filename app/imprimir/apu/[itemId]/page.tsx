import { notFound } from "next/navigation";

import { Caratula } from "@/components/impresion/caratula";
import { BotonImprimir } from "@/components/impresion/boton-imprimir";
import { obtenerApuResueltoDePresupuestoItem } from "@/lib/acciones/presupuesto";
import { obtenerParametrosEmpresa } from "@/lib/acciones/parametros-empresa";
import { formatearMoneda } from "@/lib/formato";

export const dynamic = "force-dynamic";

export default async function ImprimirApu({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const [resuelto, empresa] = await Promise.all([
    obtenerApuResueltoDePresupuestoItem(Number(itemId)),
    obtenerParametrosEmpresa(),
  ]);
  if (!resuelto) notFound();

  const { item, rubro, obra, calculo, congelado } = resuelto;
  const { apu, cargasSociales, coeficiente } = calculo;

  const materiales = apu.lineas.filter((l) => l.tipo === "material");
  const manoDeObra = apu.lineas.filter((l) => l.tipo === "mano_obra");
  const equipos = apu.lineas.filter((l) => l.tipo === "equipo");

  // La reseña de referencia (docs/formato-apu) muestra la mano de obra sin
  // cargas sociales y las cargas como una línea aparte — pero en nuestro
  // motor (CLAUDE.md 6.1) el factor ya está adentro de cada línea. Se
  // despeja acá solo para mostrarlo desagregado, sin tocar el cálculo.
  const totalManoObraSinCargas = manoDeObra.reduce(
    (suma, l) => suma + (l.detalle.rendimientoHoras ?? 0) * (l.detalle.precioUnitario ?? 0),
    0
  );
  const montoCargasSociales = apu.subtotalManoObra - totalManoObraSinCargas;

  return (
    <div className="mx-auto max-w-3xl text-sm">
      <div className="mb-4 flex justify-end">
        <BotonImprimir />
      </div>

      <Caratula titulo="Análisis de precio unitario" obra={obra} empresa={empresa} />

      <div className="mb-4 flex justify-between text-sm">
        <p>
          <span className="font-medium">Ítem:</span> {item.nroItem} — {rubro?.nombre ?? "—"}
        </p>
        <p>
          <span className="font-medium">Unidad:</span> {item.unidad}
        </p>
      </div>
      <p className="mb-4 font-medium">{item.descripcion}</p>
      {congelado && (
        <p className="mb-4 text-xs text-neutral-500">
          Composición congelada al presentar la obra ({resuelto.fechaCalculo}).
        </p>
      )}

      <SeccionTabla
        numero={1}
        titulo="Materiales"
        columnas={["N°", "Material", "Unidad", "Cantidad", "Precio unit.", "Subtotal"]}
        filas={materiales.map((l, i) => [
          i + 1,
          l.insumo ? `${l.insumo.codigo} — ${l.insumo.descripcion}` : "—",
          l.insumo?.unidad ?? "—",
          l.detalle.cantidad?.toFixed(2) ?? "—",
          formatearMoneda(l.detalle.precioUnitario),
          l.costo !== null ? formatearMoneda(l.costo) : l.error,
        ])}
        totalEtiqueta="TOTAL MATERIALES"
        totalValor={formatearMoneda(apu.subtotalMateriales)}
      />

      <SeccionTabla
        numero={2}
        titulo="Mano de obra"
        columnas={["N°", "Operario", "$/Hora", "Horas", "Subtotal"]}
        filas={manoDeObra.map((l, i) => [
          i + 1,
          l.insumo ? l.insumo.descripcion : "—",
          formatearMoneda(l.detalle.precioUnitario),
          l.detalle.rendimientoHoras?.toFixed(2) ?? "—",
          formatearMoneda(
            l.detalle.rendimientoHoras !== undefined && l.detalle.precioUnitario !== undefined
              ? l.detalle.rendimientoHoras * l.detalle.precioUnitario
              : null
          ),
        ])}
        totalEtiqueta="TOTAL MANO DE OBRA"
        totalValor={formatearMoneda(totalManoObraSinCargas)}
        filaExtra={{
          etiqueta: `CARGAS SOCIALES (factor ${cargasSociales.factor.toFixed(4)})`,
          valor: formatearMoneda(montoCargasSociales),
        }}
      />

      <SeccionTabla
        numero={3}
        titulo="Equipos"
        columnas={["N°", "Descripción", "Unidad", "Cantidad", "Precio unit.", "Subtotal"]}
        filas={equipos.map((l, i) => [
          i + 1,
          l.insumo ? l.insumo.descripcion : "—",
          l.insumo?.unidad ?? "—",
          l.detalle.rendimientoHoras?.toFixed(2) ?? "—",
          formatearMoneda(l.detalle.precioUnitario),
          l.costo !== null ? formatearMoneda(l.costo) : l.error,
        ])}
        totalEtiqueta="TOTAL EQUIPOS"
        totalValor={formatearMoneda(apu.subtotalEquipos)}
      />

      <div className="mb-4 flex justify-between border-b border-neutral-300 py-1">
        <span className="font-semibold uppercase">4. Combustibles y lubricantes</span>
        <span>{formatearMoneda(0)}</span>
      </div>
      <p className="mb-4 text-xs text-neutral-500">
        Incluidos en el costo horario de cada equipo — no se desagregan como línea aparte
        (CLAUDE.md, decisión de Fase 0).
      </p>

      <div className="mb-6 flex justify-between border-b-2 border-neutral-900 py-1 text-base font-bold">
        <span className="uppercase">5. Costo directo (1+2+3+4)</span>
        <span>{formatearMoneda(apu.costoDirecto)}</span>
      </div>

      <p className="mb-2 font-semibold uppercase">6. Determinación del precio unitario del ítem</p>
      {coeficiente ? (
        <table className="w-full border-collapse text-xs">
          <tbody>
            {coeficiente.pasos.map((paso, i) => (
              <tr key={i} className={i === coeficiente.pasos.length - 1 ? "border-t-2 border-neutral-900 font-bold" : "border-b border-neutral-100"}>
                <td className="py-1 pr-2">{paso.paso}</td>
                <td className="py-1 pr-2 text-neutral-500">{paso.detalle}</td>
                <td className="py-1 text-right">{formatearMoneda(paso.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-red-600">{calculo.errorParametros}</p>
      )}
    </div>
  );
}

function SeccionTabla({
  numero,
  titulo,
  columnas,
  filas,
  totalEtiqueta,
  totalValor,
  filaExtra,
}: {
  numero: number;
  titulo: string;
  columnas: string[];
  filas: (string | number | null | undefined)[][];
  totalEtiqueta: string;
  totalValor: string;
  filaExtra?: { etiqueta: string; valor: string };
}) {
  return (
    <div className="mb-6">
      <p className="mb-1 font-semibold uppercase">
        {numero}. {titulo}
      </p>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-neutral-900 text-left">
            {columnas.map((c) => (
              <th key={c} className="py-1 pr-2">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 ? (
            <tr>
              <td colSpan={columnas.length} className="py-1 text-neutral-400">
                Sin líneas cargadas
              </td>
            </tr>
          ) : (
            filas.map((fila, i) => (
              <tr key={i} className="border-b border-neutral-100">
                {fila.map((valor, j) => (
                  <td key={j} className={`py-1 pr-2 ${j === 0 ? "" : "text-right"}`}>
                    {valor ?? "—"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="border-t border-neutral-900 font-semibold">
            <td className="py-1 pr-2" colSpan={columnas.length - 1}>
              {totalEtiqueta}
            </td>
            <td className="py-1 text-right">{totalValor}</td>
          </tr>
          {filaExtra && (
            <tr className="font-semibold">
              <td className="py-1 pr-2" colSpan={columnas.length - 1}>
                {filaExtra.etiqueta}
              </td>
              <td className="py-1 text-right">{filaExtra.valor}</td>
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  );
}
