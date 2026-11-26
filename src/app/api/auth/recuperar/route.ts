import { NextResponse, type NextRequest } from "next/server";
import { recuperarSchema } from "@/schemas/auth.schema";

/**
 * Recuperar o cambiar contraseña (solo Paola y Oscar).
 * Siempre responde lo mismo, exista o no el correo, para no revelar qué cuentas hay.
 */
export async function POST(request: NextRequest) {
  const datos = recuperarSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json({ error: "Escribe un correo válido" }, { status: 400 });
  }
  // TODO(backend): llamar a `${BACKEND_URL}/api/auth/recuperar`, que envía el enlace por correo.
  return NextResponse.json({ ok: true });
}
