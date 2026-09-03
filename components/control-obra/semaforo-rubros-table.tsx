import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatearMoneda } from "@/lib/formato";
import type { listarControlDeObra } from "@/lib/acciones/control-obra";
import type { Semaforo } from "@/lib/calculo/valor-ganado";

type Control = NonNullable<Awaited<ReturnType<typeof listarControlDeObra>>>;
type RubroControl = Control["rubros"][number];

const ETIQUETA_SEMAFORO: Record<Semaforo, string> = { verde: "Al día", amarillo: "Atención", rojo: "Atrasado" };
const COLOR_PUNTO: Record<Semaforo, string> = { verde: "bg-emerald-500", amarillo: "bg-amber-500", rojo: "bg-red-500" };

export function SemaforoRubrosTable({ rubros }: { rubros: RubroControl[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rubro</TableHead>
          <TableHead>PV (planificado)</TableHead>
          <TableHead>EV (ganado)</TableHead>
          <TableHead>SPI</TableHead>
          <TableHead>SV (desvío $)</TableHead>
          <TableHead>Desvío (días)</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rubros.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-neutral-500">
              Todavía no hay rubros planificados.
            </TableCell>
          </TableRow>
        ) : (
          rubros.map((rubro) => (
            <TableRow key={rubro.rubroId}>
              <TableCell className="font-medium">{rubro.nombre}</TableCell>
              <TableCell>{formatearMoneda(rubro.pv)}</TableCell>
              <TableCell>{formatearMoneda(rubro.ev)}</TableCell>
              <TableCell>{rubro.spi === null ? "—" : rubro.spi.toFixed(2)}</TableCell>
              <TableCell className={cn(rubro.sv < 0 && "text-red-600")}>{formatearMoneda(rubro.sv)}</TableCell>
              <TableCell className={cn((rubro.desvioDias ?? 0) > 0 && "text-red-600")}>
                {rubro.desvioDias === null ? "—" : `${rubro.desvioDias > 0 ? "+" : ""}${rubro.desvioDias.toFixed(0)}`}
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-2">
                  <span className={cn("inline-block h-2.5 w-2.5 rounded-full", COLOR_PUNTO[rubro.semaforo])} />
                  {ETIQUETA_SEMAFORO[rubro.semaforo]}
                </span>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
