"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatearMoneda } from "@/lib/formato";

const COLORES = ["#2563eb", "#f59e0b", "#10b981"];

export function ComposicionPieChart({
  materiales,
  manoObra,
  equipos,
}: {
  materiales: number;
  manoObra: number;
  equipos: number;
}) {
  const total = materiales + manoObra + equipos;
  const datos = [
    { nombre: "Materiales", valor: materiales },
    { nombre: "Mano de obra", valor: manoObra },
    { nombre: "Equipos", valor: equipos },
  ].filter((d) => d.valor > 0);

  if (datos.length === 0) {
    return <p className="text-sm text-neutral-500">Sin datos para graficar todavía.</p>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={datos}
            dataKey="valor"
            nameKey="nombre"
            outerRadius={100}
            label={({ nombre, valor }) => `${nombre}: ${total === 0 ? 0 : ((valor / total) * 100).toFixed(0)}%`}
          >
            {datos.map((_, indice) => (
              <Cell key={indice} fill={COLORES[indice % COLORES.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(valor: number) => formatearMoneda(valor)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
