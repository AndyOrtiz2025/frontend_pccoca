import { NextResponse } from "next/server";
import { cambiarEstadoProceso } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { cambioEstadoSchema } from "@/schemas/proceso.schema";

/** Recibido → En proceso → Listo para entregar. Solo el responsable (Paola u Oscar). */
export async function POST(request: Request, ctx: RouteContext<"/api/procesos/[id]/estado">) {
  const sesion = await exigirSesion(["paola", "oscar"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = cambioEstadoSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: "Elige un estado" }, { status: 400 });
  const { id } = await ctx.params;
  try {
    const proceso = await cambiarEstadoProceso(sesion.rol, id, datos.data.estado);
    return NextResponse.json({ estado: proceso.estado });
  } catch (e) {
    return respuestaDeError(e);
  }
}
