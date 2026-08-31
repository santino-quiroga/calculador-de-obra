"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const modulos = [
  { href: "/bases-maestras", etiqueta: "Bases maestras", fase: 1 },
  { href: "/catalogo", etiqueta: "Catálogo de ítems", fase: 2 },
  { href: "/obras", etiqueta: "Obras y presupuesto", fase: 3 },
  { href: "/resumen-empresa", etiqueta: "Resumen de empresa", fase: 4 },
  { href: "/plan-trabajos", etiqueta: "Plan de trabajos", fase: 6 },
  { href: "/control-obra", etiqueta: "Control de obra", fase: 7 },
  { href: "/certificados", etiqueta: "Certificados", fase: 8 },
];

export function NavSidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-64 shrink-0 border-r border-neutral-200 bg-neutral-50 p-4">
      <Link href="/" className="mb-6 block text-lg font-semibold text-neutral-900">
        Programa de obra
      </Link>
      <ul className="space-y-1">
        {modulos.map((modulo) => {
          const activo = pathname === modulo.href;
          return (
            <li key={modulo.href}>
              <Link
                href={modulo.href}
                className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                  activo
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                {modulo.etiqueta}
                <span className="ml-2 text-xs text-neutral-400">Fase {modulo.fase}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
