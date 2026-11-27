import { NextResponse } from "next/server";
import { editarProducto } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { leerFormularioProducto } from "@/lib/formulario-producto";

/** Editar producto: datos, precios y foto (el stock no se toca aquí). */
export async function PATCH(request: Request, ctx: RouteContext<"/api/productos/[id]">) {
  const sesion = await exigirSesion(["paola", "oscar"]);
  if (sesion instanceof NextResponse) return sesion;
  const form = await leerFormularioProducto(request);
  if (!form.ok) return NextResponse.json({ error: form.error }, { status: form.status });
  const { id } = await ctx.params;
  try {
    await editarProducto(sesion.rol, id, form.datos, form.foto);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaDeError(e);
  }
}
