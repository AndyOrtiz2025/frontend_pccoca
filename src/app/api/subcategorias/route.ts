import { NextResponse } from "next/server";
import { administrarSubcategoria } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { subcategoriaSchema } from "@/schemas/subcategoria.schema";

/** Crear, renombrar/unir o eliminar una subcategoría (Paola: Librería y Varios; Oscar: Tecnología). */
export async function POST(request: Request) {
  const sesion = await exigirSesion(["paola", "oscar"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = subcategoriaSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await administrarSubcategoria(sesion.rol, datos.data));
  } catch (e) {
    return respuestaDeError(e);
  }
}
