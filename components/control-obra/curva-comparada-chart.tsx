"use client";

// Curva teórica y curva real superpuestas en el mismo gráfico (CLAUDE.md
// 6.4). La curva real se corta en el último mes con avances cargados: se
// arma con `real: null` a partir de ahí, y Recharts no dibuja el tramo sin
// datos (connectNulls={false}).

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatearMoneda } from "@/lib/formato";
import type { PuntoCurva } from "@/lib/calculo/curva-inversion";

function combinarCurvas(teorica: PuntoCurva[], real: PuntoCurva[]) {
  const periodos = new Set([...teorica.map((p) => p.periodo), ...real.map((p) => p.periodo)]);
  const teoricaPorPeriodo = new Map(teorica.map((p) => [p.periodo, p.acumulado]));
  const realPorPeriodo = new Map(real.map((p) => [p.periodo, p.acumulado]));
  const ultimoPeriodoReal = real.length > 0 ? real[real.length - 1].periodo : null;

  let ultimoTeorico = 0;
  let ultimoReal = 0;

  return [...periodos].sort().map((periodo) => {
    if (teoricaPorPeriodo.has(periodo)) ultimoTeorico = teoricaPorPeriodo.get(periodo)!;
    if (realPorPeriodo.has(periodo)) ultimoReal = realPorPeriodo.get(periodo)!;
    return {
      periodo,
      teorico: ultimoTeorico,
      real: ultimoPeriodoReal && periodo <= ultimoPeriodoReal ? ultimoReal : null,
    };
  });
}

export function CurvaComparadaChart({ curvaTeorica, curvaReal }: { curvaTeorica: PuntoCurva[]; curvaReal: PuntoCurva[] }) {
  const datos = combinarCurvas(curvaTeorica, curvaReal);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={datos} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(valor: number) => formatearMoneda(valor)} width={90} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(valor: number) => formatearMoneda(valor)} labelFormatter={(periodo) => `Período ${periodo}`} />
          <Legend />
          <Area
            type="monotone"
            dataKey="teorico"
            name="Teórica (contrato)"
            stroke="#2563eb"
            fill="#2563eb"
            fillOpacity={0.12}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="real"
            name="Real"
            stroke="#059669"
            fill="#059669"
            fillOpacity={0.15}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
