import { listarObras } from "@/lib/acciones/obras";
import { CertificadosClient } from "@/components/certificados/certificados-client";

export const dynamic = "force-dynamic";

export default async function Certificados() {
  const obras = await listarObras();
  return <CertificadosClient obras={obras} />;
}
