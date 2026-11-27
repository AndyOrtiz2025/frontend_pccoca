import { NextResponse } from "next/server";
import { z } from "zod";
import { cambiarActivoProducto } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";

const esquema = z.object({ activo: z.boolean() });

/** Desactivar (deja de venderse) o reactivar un producto. Nunca se borra. */
export async function POST(request: Request, ctx: RouteContext<"/api/productos/[id]/activo">) {
  const sesion = await exigirSesion(["paola", "oscar"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = esquema.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { id } = await ctx.params;
  try {
    const producto = await cambiarActivoProducto(sesion.rol, id, datos.data.activo);
    return NextResponse.json({ activo: producto.activo });
  } catch (e) {
    return respuestaDeError(e);
  }
}
