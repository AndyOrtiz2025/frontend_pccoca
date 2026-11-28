import { NextResponse } from "next/server";
import { crearTramite } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { tramiteSchema } from "@/schemas/tramite.schema";

/** Nuevo trámite en el catálogo (solo Paola). */
export async function POST(request: Request) {
  const sesion = await exigirSesion(["paola"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = tramiteSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  try {
    const t = await crearTramite(sesion.rol, datos.data);
    return NextResponse.json({ id: t.id }, { status: 201 });
  } catch (e) {
    return respuestaDeError(e);
  }
}
