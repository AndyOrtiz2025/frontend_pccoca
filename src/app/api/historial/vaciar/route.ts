import { NextResponse } from "next/server";
import { vaciarHistorial } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";

/** Paola u Oscar vacían su historial de entregados y descartados (sigue en reportes). */
export async function POST() {
  const sesion = await exigirSesion(["paola", "oscar"]);
  if (sesion instanceof NextResponse) return sesion;
  try {
    return NextResponse.json(await vaciarHistorial(sesion.rol));
  } catch (e) {
    return respuestaDeError(e);
  }
}
