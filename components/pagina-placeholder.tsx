export function PaginaPlaceholder({
  titulo,
  fase,
  descripcion,
}: {
  titulo: string;
  fase: number;
  descripcion: string;
}) {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-neutral-900">{titulo}</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Todavía no implementado — llega en la Fase {fase}.
      </p>
      <p className="mt-4 text-neutral-700">{descripcion}</p>
    </div>
  );
}
