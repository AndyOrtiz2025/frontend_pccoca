import "server-only";
import { NextResponse } from "next/server";
import type { ZodSafeParseResult } from "zod";
import { ReglaNegocioError, SinPermisoError } from "@/lib/api";
import type { Rol } from "./roles";
import { obtenerSesion } from "./server";
import type { Sesion } from "./session";

/**
 * Exige sesión (y opcionalmente ciertos roles) en una ruta /api.
 * Devuelve la sesión o una respuesta 401/403 lista para retornar.
 */
export async function exigirSesion(roles?: Rol[]): Promise<Sesion | NextResponse> {
  const sesion = await obtenerSesion();
  if (!sesion)
    return NextResponse.json(
      { error: "Tu sesión terminó. Vuelve a iniciar sesión." },
      { status: 401 },
    );
  if (roles && !roles.includes(sesion.rol)) {
    return NextResponse.json({ error: "No tienes permiso para hacer esto" }, { status: 403 });
  }
  return sesion;
}

/** Convierte los errores conocidos en respuestas claras; los demás, en un 500 sin detalles internos. */
export function respuestaDeError(e: unknown): NextResponse {
  if (e instanceof ReglaNegocioError)
    return NextResponse.json({ error: e.message }, { status: 409 });
  if (e instanceof SinPermisoError) return NextResponse.json({ error: e.message }, { status: 403 });
  console.error(e);
  return NextResponse.json({ error: "Ocurrió un error. Intenta de nuevo." }, { status: 500 });
}

/**
 * Lee el cuerpo JSON y lo valida con el esquema. Devuelve los datos o una respuesta 400
 * con el primer error (y el campo) lista para retornar.
 */
export async function leerJson<T>(
  request: Request,
  esquema: { safeParse: (v: unknown) => ZodSafeParseResult<T> },
): Promise<T | NextResponse> {
  const r = esquema.safeParse(await request.json().catch(() => null));
  if (r.success) return r.data;
  const i = r.error.issues[0];
  return NextResponse.json(
    { error: i?.message ?? "Datos inválidos", campo: i?.path.join(".") },
    { status: 400 },
  );
}
