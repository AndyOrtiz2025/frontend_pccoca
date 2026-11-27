import { NextResponse } from "next/server";
import { abrirPaqueteProducto } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";

/** "Abrir nuevo paquete" (sección 11.5): Empleado, Paola y Oscar. */
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/productos/[id]/abrir-paquete">,
) {
  const sesion = await exigirSesion();
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await ctx.params;
  try {
    return NextResponse.json({ producto: await abrirPaqueteProducto(id, sesion.nombre) });
  } catch (e) {
    return respuestaDeError(e);
  }
}
