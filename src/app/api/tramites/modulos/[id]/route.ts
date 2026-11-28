import { NextResponse } from "next/server";
import { eliminarModuloTramite, moverModuloTramite, renombrarModuloTramite } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { editarModuloSchema } from "@/schemas/tramite.schema";

/** Cambiar el nombre del módulo o moverlo de lugar en las pestañas. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/tramites/modulos/[id]">) {
  const sesion = await exigirSesion(["paola"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = editarModuloSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  const { id } = await ctx.params;
  try {
    if ("mover" in datos.data) await moverModuloTramite(sesion.rol, id, datos.data.mover);
    else await renombrarModuloTramite(sesion.rol, id, datos.data.nombre);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaDeError(e);
  }
}

/** Eliminar un módulo vacío. */
export async function DELETE(_request: Request, ctx: RouteContext<"/api/tramites/modulos/[id]">) {
  const sesion = await exigirSesion(["paola"]);
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await ctx.params;
  try {
    await eliminarModuloTramite(sesion.rol, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaDeError(e);
  }
}
