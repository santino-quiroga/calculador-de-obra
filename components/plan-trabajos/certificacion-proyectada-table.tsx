import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatearMoneda } from "@/lib/formato";
import type { PuntoCurva } from "@/lib/calculo/curva-inversion";

export function CertificacionProyectadaTable({ curva }: { curva: PuntoCurva[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Período</TableHead>
          <TableHead>Certificación proyectada</TableHead>
          <TableHead>Acumulado</TableHead>
          <TableHead>Acumulado %</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {curva.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-neutral-500">
              Todavía no hay tareas planificadas.
            </TableCell>
          </TableRow>
        ) : (
          curva.map((punto) => (
            <TableRow key={punto.periodo}>
              <TableCell>{punto.periodo}</TableCell>
              <TableCell>{formatearMoneda(punto.montoPeriodo)}</TableCell>
              <TableCell>{formatearMoneda(punto.acumulado)}</TableCell>
              <TableCell>{punto.acumuladoPct.toFixed(1)}%</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
