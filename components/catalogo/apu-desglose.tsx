import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatearMoneda } from "@/lib/formato";
import type { calcularApuDeItem } from "@/lib/acciones/catalogo";

type ResultadoCalculo = Awaited<ReturnType<typeof calcularApuDeItem>>;

const ETIQUETAS_TIPO: Record<string, string> = {
  material: "Material",
  mano_obra: "Mano de obra",
  equipo: "Equipo",
};

const ETIQUETAS_BASE: Record<string, string> = {
  salario_basico: "Salario básico",
  subtotal_remunerativo: "Subtotal remunerativo",
  base_aportes: "Base de aportes",
  subtotal_liquidado: "Subtotal liquidado",
};

export function ApuDesglose({ calculo }: { calculo: ResultadoCalculo }) {
  const { apu, cargasSociales, coeficiente, errorParametros } = calculo;

  return (
    <div className="mt-6 space-y-6 border-t pt-6">
      <div>
        <p className="text-sm font-medium">Desagregado</p>
        <Table className="mt-2">
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Insumo</TableHead>
              <TableHead>Cant. / Rend.</TableHead>
              <TableHead>Precio unit.</TableHead>
              <TableHead>Costo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apu.lineas.map((linea) => (
              <TableRow key={linea.componenteId}>
                <TableCell>{ETIQUETAS_TIPO[linea.tipo]}</TableCell>
                <TableCell>
                  {linea.insumo ? `${linea.insumo.codigo} — ${linea.insumo.descripcion}` : "—"}
                </TableCell>
                <TableCell>
                  {linea.detalle.cantidad ?? linea.detalle.rendimientoHoras ?? "—"}
                  {linea.detalle.desperdicioPct ? ` (+${linea.detalle.desperdicioPct}% desp.)` : ""}
                </TableCell>
                <TableCell>
                  {linea.detalle.precioUnitario !== undefined
                    ? formatearMoneda(linea.detalle.precioUnitario)
                    : "—"}
                </TableCell>
                <TableCell>
                  {linea.costo !== null ? (
                    formatearMoneda(linea.costo)
                  ) : (
                    <span className="text-red-600">{linea.error}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="rounded-md border p-3">
          <p className="text-neutral-500">Materiales</p>
          <p className="text-lg font-semibold">{formatearMoneda(apu.subtotalMateriales)}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-neutral-500">Mano de obra</p>
          <p className="text-lg font-semibold">{formatearMoneda(apu.subtotalManoObra)}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-neutral-500">Equipos</p>
          <p className="text-lg font-semibold">{formatearMoneda(apu.subtotalEquipos)}</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">
          Factor de cargas sociales: <strong>{cargasSociales.factor.toFixed(4)}</strong>
        </p>
        <Table className="mt-2">
          <TableHeader>
            <TableRow>
              <TableHead>Concepto</TableHead>
              <TableHead>Alícuota</TableHead>
              <TableHead>Base</TableHead>
              <TableHead>Monto base</TableHead>
              <TableHead>Incremento</TableHead>
              <TableHead>Acumulado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargasSociales.pasos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-neutral-500">
                  No hay conceptos de cargas sociales activos (Bases maestras).
                </TableCell>
              </TableRow>
            ) : (
              cargasSociales.pasos.map((paso, indice) => (
                <TableRow key={indice}>
                  <TableCell>{paso.concepto}</TableCell>
                  <TableCell>{paso.alicuotaPct}%</TableCell>
                  <TableCell>{ETIQUETAS_BASE[paso.baseAplicacion]}</TableCell>
                  <TableCell>{paso.montoBase.toFixed(4)}</TableCell>
                  <TableCell>{paso.incremento.toFixed(4)}</TableCell>
                  <TableCell>{paso.acumulado.toFixed(4)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-md border p-4">
        <p className="text-sm text-neutral-500">Costo directo</p>
        <p className="text-xl font-semibold">{formatearMoneda(apu.costoDirecto)}</p>
      </div>

      {errorParametros ? (
        <p className="text-sm text-red-600">{errorParametros}</p>
      ) : coeficiente ? (
        <div>
          <p className="text-sm font-medium">Coeficiente resumen — paso a paso</p>
          <Table className="mt-2">
            <TableHeader>
              <TableRow>
                <TableHead>Paso</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead>Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coeficiente.pasos.map((paso, indice) => (
                <TableRow key={indice}>
                  <TableCell>{paso.paso}</TableCell>
                  <TableCell className="text-neutral-500">{paso.detalle}</TableCell>
                  <TableCell>{formatearMoneda(paso.valor)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 rounded-md border border-neutral-900 bg-neutral-50 p-4">
            <p className="text-sm text-neutral-500">
              Precio de venta (coeficiente k = {coeficiente.coeficienteK.toFixed(4)})
            </p>
            <p className="text-2xl font-semibold">{formatearMoneda(coeficiente.precioFinal)}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
