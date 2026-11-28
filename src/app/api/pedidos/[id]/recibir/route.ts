import { NextResponse } from "next/server";
import { recibirPedido } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { recibirPedidoSchema } from "@/schemas/pedido.schema";

/** Revisar paquete: registra lo que vino como compra y marca lo que ya no se pide. */
export async function POST(request: Request, ctx: RouteContext<"/api/pedidos/[id]/recibir">) {
  const sesion = await exigirSesion(["paola", "oscar"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = recibirPedidoSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  const { id } = await ctx.params;
  try {
    return NextResponse.json(await recibirPedido(sesion.rol, id, datos.data, sesion.nombre));
  } catch (e) {
    return respuestaDeError(e);
  }
}
