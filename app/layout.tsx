import type { Metadata } from "next";
import "./globals.css";
import { NavSidebar } from "@/components/nav-sidebar";

export const metadata: Metadata = {
  title: "Programa de obra",
  description: "Cómputos, presupuestos y control de obra",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="flex min-h-screen bg-white text-neutral-900 antialiased">
        <NavSidebar />
        <main className="flex-1 p-8">{children}</main>
      </body>
    </html>
  );
}
