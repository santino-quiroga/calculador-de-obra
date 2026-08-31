import { PaginaPlaceholder } from "@/components/pagina-placeholder";

export default function Obras() {
  return (
    <PaginaPlaceholder
      titulo="Obras y presupuesto"
      fase={3}
      descripcion="Acá vas a dar de alta obras, elegir su fecha base de precios, y cargar el presupuesto tipo planilla: elegís rubro e ítem, cargás la cantidad, y todo lo demás se calcula solo."
    />
  );
}
