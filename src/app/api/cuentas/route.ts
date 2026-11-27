import { NextResponse, type NextRequest } from "next/server";
import { crearCuenta } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { cuentaSchema } from "@/schemas/pendiente.schema";

/** Nuevo cliente u organización para pendientes. Solo el Empleado (Paola lee). */
export async function POST(request: NextRequest) {
  const sesion = await exigirSesion(["empleado"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = cuentaSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json({ cuenta: await crearCuenta(datos.data) }, { status: 201 });
  } catch (e) {
    return respuestaDeError(e);
  }
}
