import { NextResponse, type NextRequest } from "next/server";
import { autenticarMock } from "@/lib/auth/mock-users";
import { estaBloqueado, limpiarIntentos, registrarFallo } from "@/lib/auth/rate-limit";
import { INICIO_ROL } from "@/lib/auth/roles";
import { loginSchema } from "@/schemas/auth.schema";
import { COOKIE_SESION, firmarSesion, opcionesCookie } from "@/lib/auth/session";

// Respuesta genérica: nunca decimos si el usuario existe o no (guía, sección Seguridad).
const ERROR_GENERICO = "Usuario o contraseña incorrectos";

export async function POST(request: NextRequest) {
  const cuerpo = await request.json().catch(() => null);
  const datos = loginSchema.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json({ error: ERROR_GENERICO }, { status: 400 });
  }

  const { perfil, usuario, password } = datos.data;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const claves = [`ip:${ip}`, `usuario:${usuario.toLowerCase()}`];

  if (estaBloqueado(claves)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera 15 minutos e intenta de nuevo." },
      { status: 429 },
    );
  }

  // TODO(backend): cuando USE_MOCKS=false, llamar a `${BACKEND_URL}/api/auth/login`
  // y guardar en la cookie el JWT que devuelva el backend.
  const sesion = autenticarMock(perfil, usuario, password);
  if (!sesion) {
    registrarFallo(claves);
    return NextResponse.json({ error: ERROR_GENERICO }, { status: 401 });
  }

  limpiarIntentos(claves);
  const respuesta = NextResponse.json({ redirectTo: INICIO_ROL[sesion.rol] });
  respuesta.cookies.set(COOKIE_SESION, await firmarSesion(sesion), opcionesCookie);
  return respuesta;
}
