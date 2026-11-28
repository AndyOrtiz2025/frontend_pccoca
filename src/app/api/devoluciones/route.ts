import { NextResponse, type NextRequest } from "next/server";
import { registrarDevolucion } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { devolucionSchema } from "@/schemas/devolucion.schema";

/**
 * Registrar una devolución de cliente (desde la vista Empleado, como las ventas).
 * El cuerpo trae qué devuelve y qué se lleva; los precios y el saldo los calcula el servidor.
 */
export async function POST(request: NextRequest) {
  const sesion = await exigirSesion(["empleado"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = devolucionSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      await registrarDevolucion(datos.data, { usuario: sesion.usuario, nombre: sesion.nombre }),
      { status: 201 },
    );
  } catch (e) {
    return respuestaDeError(e);
  }
}
