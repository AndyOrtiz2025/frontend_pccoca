import { NextResponse } from "next/server";
import { agregarContrasena } from "@/lib/api-clientes";
import { exigirSesion, leerJson, respuestaDeError } from "@/lib/auth/respuestas";
import { contrasenaClienteSchema } from "@/schemas/cliente.schema";

/** "+ Agregar contraseña". */
export async function POST(request: Request, ctx: RouteContext<"/api/clientes/[id]/contrasenas">) {
  const sesion = await exigirSesion(["paola"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = await leerJson(request, contrasenaClienteSchema);
  if (datos instanceof NextResponse) return datos;
  const { id } = await ctx.params;
  try {
    await agregarContrasena(sesion.rol, id, datos);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return respuestaDeError(e);
  }
}
