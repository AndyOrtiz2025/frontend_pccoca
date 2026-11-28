import { NextResponse } from "next/server";
import { quitarArchivoCliente } from "@/lib/api-clientes";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";

/** Quitar un archivo del cliente (la descarga es por /api/archivos/[id]). */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/clientes/[id]/archivos/[archivoId]">,
) {
  const sesion = await exigirSesion(["paola"]);
  if (sesion instanceof NextResponse) return sesion;
  const { id, archivoId } = await ctx.params;
  try {
    await quitarArchivoCliente(sesion.rol, id, archivoId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaDeError(e);
  }
}
