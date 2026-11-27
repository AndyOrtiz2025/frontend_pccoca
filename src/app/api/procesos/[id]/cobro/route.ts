import { NextResponse } from "next/server";
import { definirCobro } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { cobroSchema } from "@/schemas/proceso.schema";

/** Paola u Oscar dicen cuánto cobrar; el servidor descuenta lo que ya dejó el cliente. */
export async function POST(request: Request, ctx: RouteContext<"/api/procesos/[id]/cobro">) {
  const sesion = await exigirSesion(["paola", "oscar"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = cobroSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  const { id } = await ctx.params;
  try {
    const proceso = await definirCobro(sesion.rol, id, datos.data.total, datos.data.detalle);
    return NextResponse.json({ cobro: proceso.cobro });
  } catch (e) {
    return respuestaDeError(e);
  }
}
