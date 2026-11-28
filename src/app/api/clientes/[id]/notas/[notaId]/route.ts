import { NextResponse } from "next/server";
import { quitarNotaCliente } from "@/lib/api-clientes";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/clientes/[id]/notas/[notaId]">,
) {
  const sesion = await exigirSesion(["paola"]);
  if (sesion instanceof NextResponse) return sesion;
  const { id, notaId } = await ctx.params;
  try {
    await quitarNotaCliente(sesion.rol, id, notaId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaDeError(e);
  }
}
