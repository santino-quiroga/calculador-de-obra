// Exportación a Excel (Fase 8, CLAUDE.md módulo 11). Un libro por obra, una
// hoja por cosa: Presupuesto, APUs, Plan de trabajos y Curva de inversión.
// ExcelJS no genera gráficos nativos de Excel, así que la curva va como
// tabla de datos — lista para graficar con un clic, no como imagen.

import ExcelJS from "exceljs";

import { listarPresupuesto, obtenerApuResueltoDePresupuestoItem } from "@/lib/acciones/presupuesto";
import { listarPlanDeTrabajos, calcularCurvaTeoricaDeObra } from "@/lib/acciones/plan-trabajos";
import { construirTareasDelPlan } from "@/lib/acciones/plan-trabajos-helpers";
import { obtenerParametrosEmpresa } from "@/lib/acciones/parametros-empresa";
import { calcularCurvaTeorica } from "@/lib/calculo/curva-inversion";
import { formatearFecha } from "@/lib/formato";

type Presupuesto = NonNullable<Awaited<ReturnType<typeof listarPresupuesto>>>;
type Plan = NonNullable<Awaited<ReturnType<typeof listarPlanDeTrabajos>>>;
type Empresa = Awaited<ReturnType<typeof obtenerParametrosEmpresa>>;

const FORMATO_MONEDA = '"$" #,##0.00';
const FORMATO_PCT = "0.00%";

function escribirCaratula(hoja: ExcelJS.Worksheet, titulo: string, obra: Presupuesto["obra"], empresa: Empresa) {
  hoja.addRow([titulo]).font = { bold: true, size: 14 };
  hoja.addRow([`Obra: ${obra.nombre}`]);
  hoja.addRow([`Comitente: ${obra.comitente ?? "—"}`]);
  hoja.addRow([`Ubicación: ${obra.ubicacion ?? "—"}`]);
  hoja.addRow([`Fecha base de precios: ${formatearFecha(obra.fechaBasePrecios)}`]);
  if (empresa?.razonSocial) hoja.addRow([empresa.razonSocial + (empresa.cuit ? ` — CUIT ${empresa.cuit}` : "")]);
  hoja.addRow([]);
}

function hojaPresupuesto(libro: ExcelJS.Workbook, presupuesto: Presupuesto, empresa: Empresa) {
  const hoja = libro.addWorksheet("Presupuesto");
  escribirCaratula(hoja, "Cómputo y presupuesto", presupuesto.obra, empresa);

  const filaHeader = hoja.addRow(["Ítem", "Descripción", "Unidad", "Cantidad", "Precio unitario", "Precio total", "Subtotal ítem", "Inc. %"]);
  filaHeader.font = { bold: true };

  for (const rubro of presupuesto.rubros) {
    const filaRubro = hoja.addRow([rubro.nroRubro, rubro.nombre, "", "", "", "", rubro.subtotal, rubro.incidenciaPct / 100]);
    filaRubro.font = { bold: true };
    filaRubro.getCell(7).numFmt = FORMATO_MONEDA;
    filaRubro.getCell(8).numFmt = FORMATO_PCT;

    for (const item of rubro.items) {
      const fila = hoja.addRow([item.nroItem, item.descripcion, item.unidad, item.cantidad, item.precioUnitario, item.precioTotal]);
      fila.getCell(5).numFmt = FORMATO_MONEDA;
      fila.getCell(6).numFmt = FORMATO_MONEDA;
    }
  }

  const filaTotal = hoja.addRow(["", "", "", "", "", "TOTAL", presupuesto.totalPresupuesto, 1]);
  filaTotal.font = { bold: true };
  filaTotal.getCell(7).numFmt = FORMATO_MONEDA;
  filaTotal.getCell(8).numFmt = FORMATO_PCT;

  hoja.columns = [{ width: 8 }, { width: 44 }, { width: 8 }, { width: 10 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 10 }];
}

async function hojaApus(libro: ExcelJS.Workbook, presupuesto: Presupuesto, empresa: Empresa) {
  const hoja = libro.addWorksheet("APUs");
  escribirCaratula(hoja, "Análisis de precio unitario — todos los ítems", presupuesto.obra, empresa);

  for (const rubro of presupuesto.rubros) {
    for (const item of rubro.items) {
      const resuelto = await obtenerApuResueltoDePresupuestoItem(item.id);
      if (!resuelto) continue;

      const filaTitulo = hoja.addRow([`${item.nroItem} — ${item.descripcion}`, `Unidad: ${item.unidad}`]);
      filaTitulo.font = { bold: true };

      const filaHeader = hoja.addRow(["Tipo", "Insumo", "Cantidad / Rend.", "Precio unit.", "Costo"]);
      filaHeader.font = { italic: true };

      for (const linea of resuelto.calculo.apu.lineas) {
        const fila = hoja.addRow([
          linea.tipo,
          linea.insumo ? `${linea.insumo.codigo} — ${linea.insumo.descripcion}` : "—",
          linea.detalle.cantidad ?? linea.detalle.rendimientoHoras ?? null,
          linea.detalle.precioUnitario ?? null,
          linea.costo,
        ]);
        if (linea.detalle.precioUnitario !== undefined) fila.getCell(4).numFmt = FORMATO_MONEDA;
        if (linea.costo !== null) fila.getCell(5).numFmt = FORMATO_MONEDA;
      }

      const filaCostoDirecto = hoja.addRow(["", "", "", "Costo directo", resuelto.calculo.apu.costoDirecto]);
      filaCostoDirecto.font = { bold: true };
      filaCostoDirecto.getCell(5).numFmt = FORMATO_MONEDA;

      if (resuelto.calculo.coeficiente) {
        const filaPrecio = hoja.addRow(["", "", "", "Precio de venta", resuelto.calculo.coeficiente.precioFinal]);
        filaPrecio.font = { bold: true };
        filaPrecio.getCell(5).numFmt = FORMATO_MONEDA;
      }
      hoja.addRow([]);
    }
  }

  hoja.columns = [{ width: 16 }, { width: 40 }, { width: 16 }, { width: 16 }, { width: 16 }];
}

function hojaPlanTrabajos(libro: ExcelJS.Workbook, plan: Plan, empresa: Empresa) {
  const hoja = libro.addWorksheet("Plan de trabajos");
  escribirCaratula(hoja, "Plan de trabajos", plan.obra, empresa);

  const tareas = construirTareasDelPlan(plan);
  const curvaGeneral = calcularCurvaTeorica(tareas, "mensual");
  const periodos = curvaGeneral.map((p) => p.periodo);

  const filaHeader = hoja.addRow(["Rubro", "Monto total", ...periodos]);
  filaHeader.font = { bold: true };

  for (const rubro of plan.rubros) {
    const tareasDelRubro = tareas.filter((t) => t.rubroId === rubro.rubroId);
    if (tareasDelRubro.length === 0) continue;
    const curvaRubro = calcularCurvaTeorica(tareasDelRubro, "mensual");
    const montoPorPeriodo = new Map(curvaRubro.map((p) => [p.periodo, p.montoPeriodo]));
    const montoTotal = tareasDelRubro.reduce((s, t) => s + t.monto, 0);

    const fila = hoja.addRow([rubro.nombre, montoTotal, ...periodos.map((p) => montoPorPeriodo.get(p) ?? 0)]);
    fila.getCell(2).numFmt = FORMATO_MONEDA;
    for (let i = 0; i < periodos.length; i++) fila.getCell(3 + i).numFmt = FORMATO_MONEDA;
  }

  hoja.addRow([]);
  const filaMonto = hoja.addRow(["Monto mensual", "", ...curvaGeneral.map((p) => p.montoPeriodo)]);
  filaMonto.font = { bold: true };
  const filaAcumulado = hoja.addRow(["Monto acumulado", "", ...curvaGeneral.map((p) => p.acumulado)]);
  filaAcumulado.font = { bold: true };
  for (let i = 0; i < periodos.length; i++) {
    filaMonto.getCell(3 + i).numFmt = FORMATO_MONEDA;
    filaAcumulado.getCell(3 + i).numFmt = FORMATO_MONEDA;
  }

  hoja.getColumn(1).width = 30;
  hoja.getColumn(2).width = 16;
  for (let i = 0; i < periodos.length; i++) hoja.getColumn(3 + i).width = 14;
}

function hojaCurvaInversion(libro: ExcelJS.Workbook, curva: { periodo: string; montoPeriodo: number; acumulado: number; acumuladoPct: number }[], obra: Presupuesto["obra"], empresa: Empresa) {
  const hoja = libro.addWorksheet("Curva de inversión");
  escribirCaratula(hoja, "Curva de inversión teórica", obra, empresa);

  const filaHeader = hoja.addRow(["Período", "Monto del período", "Acumulado", "Acumulado %"]);
  filaHeader.font = { bold: true };

  for (const punto of curva) {
    const fila = hoja.addRow([punto.periodo, punto.montoPeriodo, punto.acumulado, punto.acumuladoPct / 100]);
    fila.getCell(2).numFmt = FORMATO_MONEDA;
    fila.getCell(3).numFmt = FORMATO_MONEDA;
    fila.getCell(4).numFmt = FORMATO_PCT;
  }

  hoja.columns = [{ width: 14 }, { width: 18 }, { width: 18 }, { width: 14 }];
}

export async function generarLibroObra(obraId: number) {
  const [presupuesto, plan, curvaResultado, empresa] = await Promise.all([
    listarPresupuesto(obraId),
    listarPlanDeTrabajos(obraId),
    calcularCurvaTeoricaDeObra(obraId, "mensual"),
    obtenerParametrosEmpresa(),
  ]);
  if (!presupuesto) return null;

  const libro = new ExcelJS.Workbook();
  libro.creator = empresa?.razonSocial || "Programa de obra";
  libro.created = new Date();

  hojaPresupuesto(libro, presupuesto, empresa);
  await hojaApus(libro, presupuesto, empresa);
  if (plan) hojaPlanTrabajos(libro, plan, empresa);
  if (curvaResultado) hojaCurvaInversion(libro, curvaResultado.curva, presupuesto.obra, empresa);

  return libro;
}
