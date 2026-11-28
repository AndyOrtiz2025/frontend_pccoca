import { NextResponse } from "next/server";
import { editarTramite } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { tramiteSchema } from "@/schemas/tramite.schema";

/** Editar un trámite (si cambia el precio, queda guardado quién y cuándo). */
export async function PATCH(request: Request, ctx: RouteContext<"/api/tramites/[id]">) {
  const sesion = await exigirSesion(["paola"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = tramiteSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  const { id } = await ctx.params;
  try {
    await editarTramite(sesion.rol, id, datos.data, sesion.nombre);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaDeError(e);
  }
}
