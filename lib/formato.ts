export function formatearMoneda(valor: number | null | undefined) {
  if (valor === null || valor === undefined) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(valor);
}

export function formatearFecha(fechaISO: string) {
  const [anio, mes, dia] = fechaISO.split("-");
  return `${dia}/${mes}/${anio}`;
}

export function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}
