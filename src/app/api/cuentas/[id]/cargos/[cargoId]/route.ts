import { NextResponse, type NextRequest } from "next/server";
import { editarCargo } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { editarCargoSchema } from "@/schemas/pendiente.schema";

/** Corregir un cargo que todavía no se pagó (solo el empleado; queda guardado quién lo hizo). */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/cuentas/[id]/cargos/[cargoId]">,
) {
  const sesion = await exigirSesion(["empleado"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = editarCargoSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  try {
    const { id, cargoId } = await ctx.params;
    return NextResponse.json({
      cargo: await editarCargo(id, cargoId, datos.data, sesion.nombre),
    });
  } catch (e) {
    return respuestaDeError(e);
  }
}
