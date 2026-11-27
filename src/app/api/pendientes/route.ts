import { NextResponse, type NextRequest } from "next/server";
import { crearPendiente } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { pendienteSchema } from "@/schemas/pendiente.schema";

/** Registrar un fiado. Solo el Empleado (Paola lo ve en solo lectura). */
export async function POST(request: NextRequest) {
  const sesion = await exigirSesion(["empleado"]);
  if (sesion instanceof NextResponse) return sesion;

  const datos = pendienteSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      { pendiente: await crearPendiente(datos.data, sesion.nombre) },
      { status: 201 },
    );
  } catch (e) {
    return respuestaDeError(e);
  }
}
