import { NextResponse } from "next/server";
import { reiniciarAlmacen } from "@/lib/mocks/store";

/**
 * Solo para las pruebas end-to-end: vuelve los datos de prueba a su estado inicial antes de
 * cada prueba. Existe únicamente cuando el servidor arranca con E2E=1 (lo hace
 * playwright.config.ts); en cualquier otro caso responde 404 como si no existiera.
 */
export async function POST() {
  if (process.env.E2E !== "1") return new NextResponse(null, { status: 404 });
  reiniciarAlmacen();
  return NextResponse.json({ ok: true });
}
