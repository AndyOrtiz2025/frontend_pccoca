import { NextResponse } from "next/server";
import { descartarEntrada } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";

/** Descartar una entrada repetida o que el cliente ya no quiso (se conserva en el registro). */
export async function POST(_request: Request, ctx: RouteContext<"/api/entradas/[id]/descartar">) {
  const sesion = await exigirSesion(["paola", "oscar"]);
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await ctx.params;
  try {
    await descartarEntrada(sesion.rol, id, sesion.nombre);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaDeError(e);
  }
}
