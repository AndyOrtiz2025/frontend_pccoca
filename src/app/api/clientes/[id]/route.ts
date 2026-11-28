import { NextResponse } from "next/server";
import { renombrarCliente } from "@/lib/api-clientes";
import { exigirSesion, leerJson, respuestaDeError } from "@/lib/auth/respuestas";
import { clienteSchema } from "@/schemas/cliente.schema";

/** Cambiar el nombre del cliente. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/clientes/[id]">) {
  const sesion = await exigirSesion(["paola"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = await leerJson(request, clienteSchema);
  if (datos instanceof NextResponse) return datos;
  const { id } = await ctx.params;
  try {
    await renombrarCliente(sesion.rol, id, datos);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaDeError(e);
  }
}
