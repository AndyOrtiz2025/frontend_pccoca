import { NextResponse } from "next/server";
import { crearProducto } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { leerFormularioProducto } from "@/lib/formulario-producto";

/** Nuevo producto (Paola: Librería y Varios; Oscar: Tecnología). Multipart con foto opcional. */
export async function POST(request: Request) {
  const sesion = await exigirSesion(["paola", "oscar"]);
  if (sesion instanceof NextResponse) return sesion;
  const form = await leerFormularioProducto(request);
  if (!form.ok) return NextResponse.json({ error: form.error }, { status: form.status });
  try {
    const producto = await crearProducto(sesion.rol, form.datos, form.foto ?? undefined);
    return NextResponse.json({ id: producto.id }, { status: 201 });
  } catch (e) {
    return respuestaDeError(e);
  }
}
