import { NextResponse } from "next/server";
import { cambiarActivoCliente } from "@/lib/api-clientes";
import { exigirSesion, leerJson, respuestaDeError } from "@/lib/auth/respuestas";
import { activoClienteSchema } from "@/schemas/cliente.schema";

/** Desactivar o reactivar un cliente (nunca se borra). */
export async function POST(request: Request, ctx: RouteContext<"/api/clientes/[id]/activo">) {
  const sesion = await exigirSesion(["paola"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = await leerJson(request, activoClienteSchema);
  if (datos instanceof NextResponse) return datos;
  const { id } = await ctx.params;
  try {
    await cambiarActivoCliente(sesion.rol, id, datos.activo);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaDeError(e);
  }
}
