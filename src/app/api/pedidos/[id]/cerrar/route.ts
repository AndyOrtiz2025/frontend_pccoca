import { NextResponse } from "next/server";
import { cerrarPedido } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";

/** Ya no esperar lo que falta del pedido. */
export async function POST(_request: Request, ctx: RouteContext<"/api/pedidos/[id]/cerrar">) {
  const sesion = await exigirSesion(["paola", "oscar"]);
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await ctx.params;
  try {
    return NextResponse.json({ estado: await cerrarPedido(sesion.rol, id) });
  } catch (e) {
    return respuestaDeError(e);
  }
}
