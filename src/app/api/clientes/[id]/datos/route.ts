import { NextResponse } from "next/server";
import { agregarDato } from "@/lib/api-clientes";
import { exigirSesion, leerJson, respuestaDeError } from "@/lib/auth/respuestas";
import { datoClienteSchema } from "@/schemas/cliente.schema";

/** "+ Agregar dato" (DPI, teléfono, contador…). */
export async function POST(request: Request, ctx: RouteContext<"/api/clientes/[id]/datos">) {
  const sesion = await exigirSesion(["paola"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = await leerJson(request, datoClienteSchema);
  if (datos instanceof NextResponse) return datos;
  const { id } = await ctx.params;
  try {
    await agregarDato(sesion.rol, id, datos);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return respuestaDeError(e);
  }
}
