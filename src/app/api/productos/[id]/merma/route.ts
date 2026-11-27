import { NextResponse } from "next/server";
import { registrarMermaAdmin } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { mermaSchema } from "@/schemas/producto.schema";

/** Merma desde inventario: dañado, vencido, humedad… Descuenta stock con motivo. */
export async function POST(request: Request, ctx: RouteContext<"/api/productos/[id]/merma">) {
  const sesion = await exigirSesion(["paola", "oscar"]);
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await ctx.params;
  const cuerpo = await request.json().catch(() => null);
  const datos = mermaSchema.safeParse({ ...(cuerpo ?? {}), productoId: id });
  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  try {
    await registrarMermaAdmin(sesion.rol, datos.data, sesion.nombre);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return respuestaDeError(e);
  }
}
