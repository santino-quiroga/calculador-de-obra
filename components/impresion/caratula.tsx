import { formatearFecha } from "@/lib/formato";
import type { obtenerObra } from "@/lib/acciones/obras";
import type { obtenerParametrosEmpresa } from "@/lib/acciones/parametros-empresa";

type Obra = NonNullable<Awaited<ReturnType<typeof obtenerObra>>>;
type Empresa = Awaited<ReturnType<typeof obtenerParametrosEmpresa>>;

// Encabezado de toda exportación e impresión: quién presenta (datos de
// Bases maestras → Empresa) y para qué obra (CLAUDE.md módulo 11, "carátula
// configurable"). Mismo bloque tanto en las páginas de impresión como en
// la primera fila de cada hoja del Excel (ver lib/exportacion/excel.ts).
export function Caratula({ titulo, obra, empresa }: { titulo: string; obra: Obra; empresa: Empresa }) {
  return (
    <div className="mb-6 border-b-2 border-neutral-900 pb-4">
      <h1 className="text-xl font-bold uppercase">{titulo}</h1>
      <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
        <div>
          <p>
            <span className="font-medium">Obra:</span> {obra.nombre}
          </p>
          <p>
            <span className="font-medium">Comitente:</span> {obra.comitente ?? "—"}
          </p>
          <p>
            <span className="font-medium">Ubicación:</span> {obra.ubicacion ?? "—"}
          </p>
          <p>
            <span className="font-medium">Fecha base de precios:</span> {formatearFecha(obra.fechaBasePrecios)}
          </p>
        </div>
        <div>
          <p>
            <span className="font-medium">{empresa?.razonSocial || "Empresa / estudio"}</span>
          </p>
          {empresa?.cuit && <p>CUIT: {empresa.cuit}</p>}
          {empresa?.matricula && <p>Matrícula: {empresa.matricula}</p>}
          {empresa?.direccion && <p>{empresa.direccion}</p>}
        </div>
      </div>
    </div>
  );
}
