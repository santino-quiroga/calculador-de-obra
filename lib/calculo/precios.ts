// Resuelve el precio vigente de un insumo a una fecha dada, contra su
// historial completo (CLAUDE.md 4.2: el precio vigente es el último
// registro con fecha_vigencia <= fecha_base). Función pura: no toca la
// base de datos, así se puede testear y reutilizar tal cual en el motor
// de cálculo de APU (Fase 2).

export interface RegistroPrecio {
  fechaVigencia: string; // 'YYYY-MM-DD'
  precio: number;
}

// Si dos registros comparten la misma fecha_vigencia (por ejemplo, una carga
// manual y una actualización en lote el mismo día), gana el que se cargó
// después. Para eso, el `historial` tiene que venir ordenado de más viejo a
// más nuevo (por id/orden de inserción) — así, ante un empate de fecha, el
// que aparece más tarde en el array es el más reciente.
export function obtenerPrecioVigente<T extends RegistroPrecio>(
  historial: T[],
  fecha: string
): T | undefined {
  const vigentesALaFecha = historial.filter((registro) => registro.fechaVigencia <= fecha);

  if (vigentesALaFecha.length === 0) {
    return undefined;
  }

  return vigentesALaFecha.reduce((masReciente, actual) =>
    actual.fechaVigencia >= masReciente.fechaVigencia ? actual : masReciente
  );
}
