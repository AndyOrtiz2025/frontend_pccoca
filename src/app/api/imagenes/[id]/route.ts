import { NextResponse } from "next/server";
import { obtenerImagen } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";

/** Foto de un producto. Cualquier usuario con sesión (el empleado la ve al vender). */
export async function GET(_request: Request, ctx: RouteContext<"/api/imagenes/[id]">) {
  const sesion = await exigirSesion();
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await ctx.params;
  try {
    const { tipo, datos } = await obtenerImagen(id);
    return new NextResponse(new Blob([datos as BlobPart], { type: tipo }), {
      headers: {
        "Content-Type": tipo,
        "Content-Length": String(datos.byteLength),
        "X-Content-Type-Options": "nosniff",
        // La URL cambia cada vez que se sube otra foto: se puede guardar en caché.
        "Cache-Control": "private, max-age=86400, immutable",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (e) {
    return respuestaDeError(e);
  }
}
