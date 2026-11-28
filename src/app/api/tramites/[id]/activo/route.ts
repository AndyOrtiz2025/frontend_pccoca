import { NextResponse } from "next/server";
import { z } from "zod";
import { cambiarActivoTramite } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";

/** Desactivar o reactivar un trámite del catálogo. */
export async function POST(request: Request, ctx: RouteContext<"/api/tramites/[id]/activo">) {
  const sesion = await exigirSesion(["paola"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = z.object({ activo: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { id } = await ctx.params;
  try {
    await cambiarActivoTramite(sesion.rol, id, datos.data.activo);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaDeError(e);
  }
}
