import { listarObras } from "@/lib/acciones/obras";
import { PlanTrabajosClient } from "@/components/plan-trabajos/plan-trabajos-client";

export const dynamic = "force-dynamic";

export default async function PlanTrabajos() {
  const obras = await listarObras();
  return <PlanTrabajosClient obras={obras} />;
}
