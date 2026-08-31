import { listarItemsCatalogo } from "@/lib/acciones/catalogo";
import { listarInsumos } from "@/lib/acciones/insumos";
import { listarRubros } from "@/lib/acciones/rubros";
import { CatalogoClient } from "@/components/catalogo/catalogo-client";

export const dynamic = "force-dynamic";

export default async function Catalogo() {
  const [items, rubros, insumos] = await Promise.all([
    listarItemsCatalogo(),
    listarRubros(),
    listarInsumos(),
  ]);

  return <CatalogoClient itemsIniciales={items} rubros={rubros} insumos={insumos} />;
}
