import { NextResponse } from "next/server";
import { obtenerHistorialProducto } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";

/** Historial del producto (kardex). Solo Paola u Oscar, según la categoría. */
export async function GET(_request: Request, ctx: RouteContext<"/api/productos/[id]/historial">) {
  const sesion = await exigirSesion(["paola", "oscar"]);
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await ctx.params;
  try {
    return NextResponse.json({ eventos: await obtenerHistorialProducto(sesion.rol, id) });
  } catch (e) {
    return respuestaDeError(e);
  }
}
