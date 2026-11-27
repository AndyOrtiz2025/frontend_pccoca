import { NextResponse, type NextRequest } from "next/server";
import { registrarAbono } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { abonoSchema } from "@/schemas/pendiente.schema";

/** "Dejo un abono": monto libre que baja el saldo. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/cuentas/[id]/abonos">) {
  const sesion = await exigirSesion(["empleado"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = abonoSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  try {
    const { id } = await ctx.params;
    return NextResponse.json(
      await registrarAbono(id, datos.data.monto, datos.data.nota, sesion.nombre),
      {
        status: 201,
      },
    );
  } catch (e) {
    return respuestaDeError(e);
  }
}
