import { NextResponse } from "next/server";
import { convertirEntrada } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";

/** "Pasar a En proceso": la entrada se vuelve expediente y aparece en Seguimiento. */
export async function POST(_request: Request, ctx: RouteContext<"/api/entradas/[id]/convertir">) {
  const sesion = await exigirSesion(["paola", "oscar"]);
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await ctx.params;
  try {
    const proceso = await convertirEntrada(sesion.rol, id);
    return NextResponse.json({ id: proceso.id }, { status: 201 });
  } catch (e) {
    return respuestaDeError(e);
  }
}
