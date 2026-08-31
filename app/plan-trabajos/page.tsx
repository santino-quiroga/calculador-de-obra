import { PaginaPlaceholder } from "@/components/pagina-placeholder";

export default function PlanTrabajos() {
  return (
    <PaginaPlaceholder
      titulo="Plan de trabajos"
      fase={6}
      descripcion="Acá vas a planificar el Gantt de la obra a partir de los rubros del presupuesto y ver la curva de inversión teórica acumulada."
    />
  );
}
