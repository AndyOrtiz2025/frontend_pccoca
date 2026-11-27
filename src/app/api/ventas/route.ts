import { NextResponse, type NextRequest } from "next/server";
import { registrarVenta } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { ventaSchema } from "@/schemas/venta.schema";

/**
 * Confirmar carrito. Solo desde la vista Empleado (sección 9.1: Paola no vende desde su panel).
 * El cuerpo trae qué y cuánto; los precios los calcula el servidor.
 */
export async function POST(request: NextRequest) {
  const sesion = await exigirSesion(["empleado"]);
  if (sesion instanceof NextResponse) return sesion;

  const datos = ventaSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await registrarVenta(datos.data.lineas, sesion.nombre));
  } catch (e) {
    return respuestaDeError(e);
  }
}
