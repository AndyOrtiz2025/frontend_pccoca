import { NextResponse } from "next/server";
import { z } from "zod";
import { cambiarActivoProveedor } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";

const esquema = z.object({ activo: z.boolean() });

/** Inactivar o reactivar un proveedor. Nunca se borra (tiene historial de compras). */
export async function POST(request: Request, ctx: RouteContext<"/api/proveedores/[id]/activo">) {
  const sesion = await exigirSesion(["paola", "oscar"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = esquema.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { id } = await ctx.params;
  try {
    await cambiarActivoProveedor(sesion.rol, id, datos.data.activo);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaDeError(e);
  }
}
