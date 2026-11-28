import { NextResponse } from "next/server";
import { editarPedido } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { pedidoSchema } from "@/schemas/pedido.schema";

/** Editar un pedido que todavía no ha llegado. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/pedidos/[id]">) {
  const sesion = await exigirSesion(["paola", "oscar"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = pedidoSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  const { id } = await ctx.params;
  try {
    const pedido = await editarPedido(sesion.rol, id, datos.data);
    return NextResponse.json({ id: pedido.id });
  } catch (e) {
    return respuestaDeError(e);
  }
}
