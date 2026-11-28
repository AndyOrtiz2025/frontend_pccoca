import { NextResponse } from "next/server";
import { crearCliente } from "@/lib/api-clientes";
import { exigirSesion, leerJson, respuestaDeError } from "@/lib/auth/respuestas";
import { clienteSchema } from "@/schemas/cliente.schema";

/** Nuevo cliente frecuente (solo Paola): solo se pide el nombre. */
export async function POST(request: Request) {
  const sesion = await exigirSesion(["paola"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = await leerJson(request, clienteSchema);
  if (datos instanceof NextResponse) return datos;
  try {
    const c = await crearCliente(sesion.rol, datos);
    return NextResponse.json({ id: c.id }, { status: 201 });
  } catch (e) {
    return respuestaDeError(e);
  }
}
