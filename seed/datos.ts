// Datos de ejemplo — ilustrativos, NO son tu lista real de precios.
// Sirven para poder tocar la app (Bases maestras) antes de cargar tus
// propios insumos. Rubros y materiales típicos de una obra de vivienda en
// Argentina; mano de obra por categoría UOCRA; cargas sociales con un
// desglose representativo (ajustalo al convenio real antes de cotizar).

export const FECHA_VIGENCIA_SEED = "2026-08-01";

export const rubrosSeed = [
  { codigo: "1", nombre: "Trabajos preliminares", orden: 1 },
  { codigo: "2", nombre: "Movimiento de suelos", orden: 2 },
  { codigo: "3", nombre: "Estructura de hormigón armado", orden: 3 },
  { codigo: "4", nombre: "Mampostería", orden: 4 },
  { codigo: "5", nombre: "Instalación sanitaria", orden: 5 },
  { codigo: "6", nombre: "Instalación eléctrica", orden: 6 },
  { codigo: "7", nombre: "Revoques y cielorrasos", orden: 7 },
  { codigo: "8", nombre: "Pisos y revestimientos", orden: 8 },
  { codigo: "9", nombre: "Cubiertas", orden: 9 },
  { codigo: "10", nombre: "Pintura", orden: 10 },
];

type TipoInsumo = "material" | "mano_obra" | "equipo";

export const insumosSeed: { codigo: string; descripcion: string; unidad: string; tipo: TipoInsumo; precio: number }[] = [
  // Materiales
  { codigo: "MAT-001", descripcion: "Cemento portland, bolsa 50 kg", unidad: "bolsa", tipo: "material", precio: 12500 },
  { codigo: "MAT-002", descripcion: "Cal hidráulica, bolsa 25 kg", unidad: "bolsa", tipo: "material", precio: 6800 },
  { codigo: "MAT-003", descripcion: "Arena gruesa", unidad: "m3", tipo: "material", precio: 45000 },
  { codigo: "MAT-004", descripcion: "Arena fina", unidad: "m3", tipo: "material", precio: 42000 },
  { codigo: "MAT-005", descripcion: "Piedra partida 6-20", unidad: "m3", tipo: "material", precio: 52000 },
  { codigo: "MAT-006", descripcion: "Ladrillo hueco 12x18x33 cm", unidad: "u", tipo: "material", precio: 780 },
  { codigo: "MAT-007", descripcion: "Ladrillo hueco 8x18x33 cm", unidad: "u", tipo: "material", precio: 620 },
  { codigo: "MAT-008", descripcion: "Ladrillo común", unidad: "u", tipo: "material", precio: 340 },
  { codigo: "MAT-009", descripcion: "Hierro aletado del 6", unidad: "kg", tipo: "material", precio: 2100 },
  { codigo: "MAT-010", descripcion: "Hierro aletado del 8", unidad: "kg", tipo: "material", precio: 2050 },
  { codigo: "MAT-011", descripcion: "Hierro aletado del 10", unidad: "kg", tipo: "material", precio: 2000 },
  { codigo: "MAT-012", descripcion: "Malla Sima 15x15, diámetro 4.2 mm", unidad: "m2", tipo: "material", precio: 4200 },
  { codigo: "MAT-013", descripcion: "Cable unipolar 2.5 mm2", unidad: "m", tipo: "material", precio: 950 },
  { codigo: "MAT-014", descripcion: "Caño corrugado 3/4\"", unidad: "m", tipo: "material", precio: 620 },
  { codigo: "MAT-015", descripcion: "Caja rectangular para embutir", unidad: "u", tipo: "material", precio: 1400 },
  { codigo: "MAT-016", descripcion: "Tubo PVC 110 mm cloacal", unidad: "m", tipo: "material", precio: 8900 },
  { codigo: "MAT-017", descripcion: "Membrana asfáltica 4 mm", unidad: "m2", tipo: "material", precio: 7200 },
  { codigo: "MAT-018", descripcion: "Pintura látex interior premium", unidad: "litro", tipo: "material", precio: 9800 },

  // Mano de obra (categorías UOCRA, precio horario)
  { codigo: "MO-001", descripcion: "Oficial especializado", unidad: "hora", tipo: "mano_obra", precio: 6800 },
  { codigo: "MO-002", descripcion: "Oficial", unidad: "hora", tipo: "mano_obra", precio: 6200 },
  { codigo: "MO-003", descripcion: "Medio oficial", unidad: "hora", tipo: "mano_obra", precio: 5400 },
  { codigo: "MO-004", descripcion: "Ayudante", unidad: "hora", tipo: "mano_obra", precio: 4900 },

  // Equipos
  { codigo: "EQ-001", descripcion: "Hormigonera de 1 bolsa", unidad: "hora", tipo: "equipo", precio: 3200 },
  { codigo: "EQ-002", descripcion: "Vibrador de hormigón", unidad: "hora", tipo: "equipo", precio: 2400 },
  { codigo: "EQ-003", descripcion: "Andamio tubular (módulo)", unidad: "hora", tipo: "equipo", precio: 900 },
];

export const parametrosEmpresaSeed = {
  gastosGeneralesPct: 15,
  beneficioPct: 12,
  ingresosBrutosPct: 3.5,
  ivaPct: 21,
  selladoPct: 1,
  gastosFinancierosPct: 2,
  segurosPct: 1.5,
};

// Desglose ilustrativo — reemplazalo por el de tu convenio antes de cotizar.
export const conceptosCargaSocialSeed = [
  {
    nombre: "SAC (aguinaldo)",
    alicuotaPct: 8.33,
    baseAplicacion: "salario_basico" as const,
    orden: 1,
    observacion: "1/12 del salario anual",
  },
  {
    nombre: "Vacaciones y feriados",
    alicuotaPct: 7.69,
    baseAplicacion: "salario_basico" as const,
    orden: 2,
    observacion: null,
  },
  {
    nombre: "Aportes y contribuciones (jubilación, obra social, ART, sindicato)",
    alicuotaPct: 45,
    baseAplicacion: "subtotal_remunerativo" as const,
    orden: 3,
    observacion: null,
  },
  {
    nombre: "Fondo de Cese Laboral (Ley 22.250)",
    alicuotaPct: 12,
    baseAplicacion: "base_aportes" as const,
    orden: 4,
    observacion: "Construcción — reemplaza la indemnización tradicional",
  },
  {
    nombre: "Seguro de vida y otros no remunerativos",
    alicuotaPct: 3,
    baseAplicacion: "subtotal_liquidado" as const,
    orden: 5,
    observacion: null,
  },
];
