import { NextResponse } from "next/server";
import { marcarEntradaLeida } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";

/** Paola u Oscar abren la entrada: deja de contar como no leída. */
export async function POST(_request: Request, ctx: RouteContext<"/api/entradas/[id]/leida">) {
  const sesion = await exigirSesion(["paola", "oscar"]);
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await ctx.params;
  try {
    await marcarEntradaLeida(sesion.rol, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaDeError(e);
  }
}
