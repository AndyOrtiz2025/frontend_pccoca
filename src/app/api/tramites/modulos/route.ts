import { NextResponse } from "next/server";
import { crearModuloTramite } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { moduloTramiteSchema } from "@/schemas/tramite.schema";

/** Nuevo módulo del catálogo de trámites (ej. "MINTRAB"). */
export async function POST(request: Request) {
  const sesion = await exigirSesion(["paola"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = moduloTramiteSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  try {
    const m = await crearModuloTramite(sesion.rol, datos.data.nombre);
    return NextResponse.json({ id: m.id }, { status: 201 });
  } catch (e) {
    return respuestaDeError(e);
  }
}
