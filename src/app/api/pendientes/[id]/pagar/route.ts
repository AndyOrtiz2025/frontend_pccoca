import { NextResponse } from "next/server";
import { pagarPendiente } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";

/** "Pagado": elimina el registro (sección 8.8). Solo el Empleado. */
export async function POST(_request: Request, ctx: RouteContext<"/api/pendientes/[id]/pagar">) {
  const sesion = await exigirSesion(["empleado"]);
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await ctx.params;
  try {
    return NextResponse.json({ pendiente: await pagarPendiente(id) });
  } catch (e) {
    return respuestaDeError(e);
  }
}
