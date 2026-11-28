import { NextResponse } from "next/server";
import { crearPedido } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { pedidoSchema } from "@/schemas/pedido.schema";

/** Nuevo pedido al proveedor. */
export async function POST(request: Request) {
  const sesion = await exigirSesion(["paola", "oscar"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = pedidoSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  try {
    const pedido = await crearPedido(sesion.rol, datos.data, sesion.nombre);
    return NextResponse.json({ id: pedido.id, numero: pedido.numero }, { status: 201 });
  } catch (e) {
    return respuestaDeError(e);
  }
}
