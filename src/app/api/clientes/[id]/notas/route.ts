import { NextResponse } from "next/server";
import { agregarNotaCliente } from "@/lib/api-clientes";
import { exigirSesion, leerJson, respuestaDeError } from "@/lib/auth/respuestas";
import { notaClienteSchema } from "@/schemas/cliente.schema";

export async function POST(request: Request, ctx: RouteContext<"/api/clientes/[id]/notas">) {
  const sesion = await exigirSesion(["paola"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = await leerJson(request, notaClienteSchema);
  if (datos instanceof NextResponse) return datos;
  const { id } = await ctx.params;
  try {
    await agregarNotaCliente(sesion.rol, id, datos.texto);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return respuestaDeError(e);
  }
}
