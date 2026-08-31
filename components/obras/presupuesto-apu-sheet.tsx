"use client";

import { useEffect, useState } from "react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { calcularApuDeItem } from "@/lib/acciones/catalogo";
import { ApuDesglose } from "@/components/catalogo/apu-desglose";

type ResultadoCalculo = Awaited<ReturnType<typeof calcularApuDeItem>>;

export function PresupuestoApuSheet({
  itemCatalogoId,
  descripcion,
  fechaBasePrecios,
  onOpenChange,
}: {
  itemCatalogoId: number | null;
  descripcion: string | null;
  fechaBasePrecios: string;
  onOpenChange: (abierto: boolean) => void;
}) {
  const [calculo, setCalculo] = useState<ResultadoCalculo | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (itemCatalogoId === null) {
      setCalculo(null);
      return;
    }
    setCargando(true);
    calcularApuDeItem(itemCatalogoId, fechaBasePrecios)
      .then(setCalculo)
      .finally(() => setCargando(false));
  }, [itemCatalogoId, fechaBasePrecios]);

  return (
    <Sheet open={itemCatalogoId !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{descripcion ?? "APU"}</SheetTitle>
          <SheetDescription>Calculado a la fecha base de precios de la obra.</SheetDescription>
        </SheetHeader>
        {cargando && <p className="mt-4 text-sm text-neutral-500">Calculando...</p>}
        {calculo && <ApuDesglose calculo={calculo} />}
      </SheetContent>
    </Sheet>
  );
}
