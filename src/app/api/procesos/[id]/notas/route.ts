import { NextResponse } from "next/server";
import { agregarNotaProceso } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { notaProcesoSchema } from "@/schemas/proceso.schema";

/** Nota que el mostrador ve en Seguimiento. */
export async function POST(request: Request, ctx: RouteContext<"/api/procesos/[id]/notas">) {
  const sesion = await exigirSesion(["paola", "oscar"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = notaProcesoSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  const { id } = await ctx.params;
  try {
    await agregarNotaProceso(sesion.rol, id, sesion.nombre, datos.data.texto);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return respuestaDeError(e);
  }
}
