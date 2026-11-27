import { NextResponse, type NextRequest } from "next/server";
import { pagarCargos } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { pagarCargosSchema } from "@/schemas/pendiente.schema";

/** "Vamos a pagar esto": paga los cargos seleccionados. */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/cuentas/[id]/pagar-cargos">,
) {
  const sesion = await exigirSesion(["empleado"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = pagarCargosSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  try {
    const { id } = await ctx.params;
    return NextResponse.json(
      await pagarCargos(id, datos.data.cargoIds, datos.data.nota, sesion.nombre),
      {
        status: 201,
      },
    );
  } catch (e) {
    return respuestaDeError(e);
  }
}
