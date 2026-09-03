import { NextResponse } from "next/server";

import { generarLibroObra } from "@/lib/exportacion/excel";
import { obtenerObra } from "@/lib/acciones/obras";

export async function GET(_request: Request, { params }: { params: Promise<{ obraId: string }> }) {
  const { obraId } = await params;
  const id = Number(obraId);

  const [libro, obra] = await Promise.all([generarLibroObra(id), obtenerObra(id)]);
  if (!libro || !obra) {
    return NextResponse.json({ error: "La obra no existe" }, { status: 404 });
  }

  const buffer = await libro.xlsx.writeBuffer();
  const nombreArchivo = `${obra.nombre.replace(/[^a-z0-9]+/gi, "-")}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  });
}
