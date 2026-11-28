import { NextResponse } from "next/server";
import { cambiarPrecioProducto } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { nuevoPrecioSchema } from "@/schemas/pedido.schema";

/** Nuevo precio desde el aviso de "cambió el costo". */
export async function POST(request: Request, ctx: RouteContext<"/api/productos/[id]/precio">) {
  const sesion = await exigirSesion(["paola", "oscar"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = nuevoPrecioSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  const { id } = await ctx.params;
  try {
    await cambiarPrecioProducto(sesion.rol, id, datos.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaDeError(e);
  }
}
