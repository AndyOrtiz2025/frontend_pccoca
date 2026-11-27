import { NextResponse } from "next/server";
import { obtenerArchivo } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";

/** Descarga de un archivo de entrada de trámite (solo Paola). */
export async function GET(_request: Request, ctx: RouteContext<"/api/archivos/[id]">) {
  const sesion = await exigirSesion(["paola"]);
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await ctx.params;
  try {
    const { meta, datos } = await obtenerArchivo(sesion.rol, id);
    return new NextResponse(new Blob([datos as BlobPart], { type: meta.tipo }), {
      headers: {
        "Content-Type": meta.tipo,
        "Content-Length": String(meta.tamano),
        // "attachment": se descarga, nunca se ejecuta dentro de la página.
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(meta.nombre)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return respuestaDeError(e);
  }
}
