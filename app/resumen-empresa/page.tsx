import { listarObras } from "@/lib/acciones/obras";
import { ResumenEmpresaClient } from "@/components/resumen-empresa/resumen-empresa-client";

export const dynamic = "force-dynamic";

export default async function ResumenEmpresa() {
  const obras = await listarObras();
  return <ResumenEmpresaClient obras={obras} />;
}
