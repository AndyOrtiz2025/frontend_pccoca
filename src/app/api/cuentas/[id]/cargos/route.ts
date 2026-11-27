import { NextResponse, type NextRequest } from "next/server";
import { agregarCargo } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { cargoSchema } from "@/schemas/pendiente.schema";

/** Agregar lo que se llevó fiado. De producto: precio del servidor y descuenta stock. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/cuentas/[id]/cargos">) {
  const sesion = await exigirSesion(["empleado"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = cargoSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  try {
    const { id } = await ctx.params;
    return NextResponse.json(
      { cargo: await agregarCargo(id, datos.data, sesion.nombre) },
      { status: 201 },
    );
  } catch (e) {
    return respuestaDeError(e);
  }
}
