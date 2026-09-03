import { listarObras } from "@/lib/acciones/obras";
import { ControlObraClient } from "@/components/control-obra/control-obra-client";

export const dynamic = "force-dynamic";

export default async function ControlObra() {
  const obras = await listarObras();
  return <ControlObraClient obras={obras} />;
}
