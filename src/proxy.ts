import { NextResponse, type NextRequest } from "next/server";
import { INICIO_ROL, rolDeRuta } from "@/lib/auth/roles";
import { COOKIE_SESION, leerSesion } from "@/lib/auth/session";

/**
 * Revisión rápida de la sesión antes de cada página (guía de Next.js: "optimistic checks").
 * - Sin sesión en una ruta de rol → a la pantalla de perfiles.
 * - Con sesión de otro rol → a su propio inicio (un empleado no entra a /paola).
 * - Con sesión en las pantallas de acceso → a su inicio.
 * Ocultar algo en pantalla no basta: el backend vuelve a validar cada petición.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sesion = await leerSesion(request.cookies.get(COOKIE_SESION)?.value);
  const rolRuta = rolDeRuta(pathname);

  if (rolRuta) {
    if (!sesion) return NextResponse.redirect(new URL("/", request.url));
    if (sesion.rol !== rolRuta) {
      return NextResponse.redirect(new URL(INICIO_ROL[sesion.rol], request.url));
    }
    return NextResponse.next();
  }

  const esAcceso =
    pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/recuperar");
  if (esAcceso && sesion) {
    return NextResponse.redirect(new URL(INICIO_ROL[sesion.rol], request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login/:path*",
    "/recuperar",
    "/empleado/:path*",
    "/paola/:path*",
    "/oscar/:path*",
  ],
};
