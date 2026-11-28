import { NextResponse } from "next/server";
import { resolverReclamo } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { resolverReclamoSchema } from "@/schemas/proveedor.schema";

/** Resolver un reclamo: nos repusieron, nos devolvieron el dinero o fue pérdida. */
export async function POST(request: Request, ctx: RouteContext<"/api/reclamos/[id]/resolver">) {
  const sesion = await exigirSesion(["paola", "oscar"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = resolverReclamoSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  const { id } = await ctx.params;
  try {
    await resolverReclamo(sesion.rol, id, datos.data, sesion.nombre);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaDeError(e);
  }
}
