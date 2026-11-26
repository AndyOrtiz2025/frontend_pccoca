import { jwtVerify, SignJWT } from "jose";
import { esRol, type Rol } from "./roles";

/** Nombre de la cookie de sesión (HttpOnly: el JavaScript del navegador no la puede leer). */
export const COOKIE_SESION = "pccoca_session";

/** La sesión se cierra sola después de 8 horas (un turno). */
export const DURACION_SESION_SEG = 60 * 60 * 8;

export interface Sesion {
  usuario: string;
  nombre: string;
  rol: Rol;
}

function clave() {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto || secreto.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET debe tener al menos 32 caracteres");
    }
    // Solo en desarrollo, para que el proyecto arranque sin configurar nada.
    return new TextEncoder().encode("solo-desarrollo-no-usar-en-produccion-pccoca");
  }
  return new TextEncoder().encode(secreto);
}

export async function firmarSesion(sesion: Sesion): Promise<string> {
  return new SignJWT({ nombre: sesion.nombre, rol: sesion.rol })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sesion.usuario)
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SESION_SEG}s`)
    .sign(clave());
}

/** Devuelve la sesión si el token es válido y no ha vencido; si no, null. */
export async function leerSesion(token: string | undefined): Promise<Sesion | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, clave(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.nombre !== "string" || !esRol(payload.rol)) return null;
    return { usuario: payload.sub, nombre: payload.nombre, rol: payload.rol };
  } catch {
    return null;
  }
}

export const opcionesCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: DURACION_SESION_SEG,
};
