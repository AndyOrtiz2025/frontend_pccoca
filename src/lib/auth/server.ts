import "server-only";
import { cookies } from "next/headers";
import { COOKIE_SESION, leerSesion, type Sesion } from "./session";

/** Lee la sesión del usuario en un componente de servidor (envolver en <Suspense>). */
export async function obtenerSesion(): Promise<Sesion | null> {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  return leerSesion(token);
}
