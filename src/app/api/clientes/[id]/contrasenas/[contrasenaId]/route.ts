import { NextResponse } from "next/server";
import { editarContrasena, quitarContrasena, verContrasena } from "@/lib/api-clientes";
import { exigirSesion, leerJson, respuestaDeError } from "@/lib/auth/respuestas";
import { editarContrasenaSchema } from "@/schemas/cliente.schema";

type Ctx = RouteContext<"/api/clientes/[id]/contrasenas/[contrasenaId]">;

/** "Mostrar" o "Copiar": la contraseña solo sale del servidor cuando Paola la pide. */
export async function GET(_request: Request, ctx: Ctx) {
  const sesion = await exigirSesion(["paola"]);
  if (sesion instanceof NextResponse) return sesion;
  const { id, contrasenaId } = await ctx.params;
  try {
    const contrasena = await verContrasena(sesion.rol, id, contrasenaId);
    return NextResponse.json({ contrasena }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    return respuestaDeError(e);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  const sesion = await exigirSesion(["paola"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = await leerJson(request, editarContrasenaSchema);
  if (datos instanceof NextResponse) return datos;
  const { id, contrasenaId } = await ctx.params;
  try {
    await editarContrasena(sesion.rol, id, contrasenaId, datos);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaDeError(e);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const sesion = await exigirSesion(["paola"]);
  if (sesion instanceof NextResponse) return sesion;
  const { id, contrasenaId } = await ctx.params;
  try {
    await quitarContrasena(sesion.rol, id, contrasenaId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaDeError(e);
  }
}
