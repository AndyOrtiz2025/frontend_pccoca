import { NextResponse } from "next/server";
import { marcarEntregado } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";

/** El Empleado marca "Entregado" cuando el cliente recoge (sección 8.11). */
export async function POST(_request: Request, ctx: RouteContext<"/api/procesos/[id]/entregar">) {
  const sesion = await exigirSesion(["empleado"]);
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await ctx.params;
  try {
    await marcarEntregado(id, sesion.nombre);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaDeError(e);
  }
}
