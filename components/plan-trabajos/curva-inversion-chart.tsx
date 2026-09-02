"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatearMoneda } from "@/lib/formato";
import type { PuntoCurva } from "@/lib/calculo/curva-inversion";

export function CurvaInversionChart({ curva }: { curva: PuntoCurva[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={curva} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(valor: number) => formatearMoneda(valor)} width={90} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(valor: number) => [formatearMoneda(valor), "Acumulado"]}
            labelFormatter={(periodo) => `Período ${periodo}`}
          />
          <Area
            type="monotone"
            dataKey="acumulado"
            stroke="#2563eb"
            fill="#2563eb"
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
