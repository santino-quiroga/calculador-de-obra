"use client";

import { Button } from "@/components/ui/button";

export function BotonImprimir() {
  return (
    <Button className="no-imprimir" onClick={() => window.print()}>
      Imprimir / Guardar como PDF
    </Button>
  );
}
