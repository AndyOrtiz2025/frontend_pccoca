import { NextResponse, type NextRequest } from "next/server";
import { editarCuenta, eliminarCuenta } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { cuentaSchema } from "@/schemas/pendiente.schema";

type Ctx = RouteContext<"/api/cuentas/[id]">;

/** Editar nombre, teléfono o notas de la cuenta. */
export async function PATCH(request: NextRequest, ctx: Ctx) {
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
    const { id } = await ctx.params;
    return NextResponse.json({ cuenta: await editarCuenta(id, datos.data) });
  } catch (e) {
    return respuestaDeError(e);
  }
}

/** Eliminar un cliente que ya no regresa (solo con saldo Q 0.00). */
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const sesion = await exigirSesion(["empleado"]);
  if (sesion instanceof NextResponse) return sesion;
  try {
    const { id } = await ctx.params;
    await eliminarCuenta(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaDeError(e);
  }
}
