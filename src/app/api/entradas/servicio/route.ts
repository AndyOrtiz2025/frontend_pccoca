import { NextResponse, type NextRequest } from "next/server";
import { crearEntradaServicio } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { entradaServicioSchema } from "@/schemas/entrada.schema";

/** El Empleado registra lo que antes mandaba por WhatsApp a Oscar. */
export async function POST(request: NextRequest) {
  const sesion = await exigirSesion(["empleado"]);
  if (sesion instanceof NextResponse) return sesion;

  const datos = entradaServicioSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(
      { entrada: await crearEntradaServicio(datos.data, sesion.nombre) },
      { status: 201 },
    );
  } catch (e) {
    return respuestaDeError(e);
  }
}
