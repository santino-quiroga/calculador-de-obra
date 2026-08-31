import { listarObras } from "@/lib/acciones/obras";
import { ObrasClient } from "@/components/obras/obras-client";

export const dynamic = "force-dynamic";

export default async function Obras() {
  const obras = await listarObras();
  return <ObrasClient obrasIniciales={obras} />;
}
