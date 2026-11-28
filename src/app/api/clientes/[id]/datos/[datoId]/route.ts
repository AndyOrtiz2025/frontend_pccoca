import { NextResponse } from "next/server";
import { editarDato, quitarDato } from "@/lib/api-clientes";
import { exigirSesion, leerJson, respuestaDeError } from "@/lib/auth/respuestas";
import { datoClienteSchema } from "@/schemas/cliente.schema";

type Ctx = RouteContext<"/api/clientes/[id]/datos/[datoId]">;

export async function PATCH(request: Request, ctx: Ctx) {
  const sesion = await exigirSesion(["paola"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = await leerJson(request, datoClienteSchema);
  if (datos instanceof NextResponse) return datos;
  const { id, datoId } = await ctx.params;
  try {
    await editarDato(sesion.rol, id, datoId, datos);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaDeError(e);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const sesion = await exigirSesion(["paola"]);
  if (sesion instanceof NextResponse) return sesion;
  const { id, datoId } = await ctx.params;
  try {
    await quitarDato(sesion.rol, id, datoId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaDeError(e);
  }
}
