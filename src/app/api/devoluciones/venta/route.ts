import { NextResponse, type NextRequest } from "next/server";
import { buscarVentaParaDevolucion } from "@/lib/api";
import { exigirSesion } from "@/lib/auth/respuestas";

/** Buscar la venta por el número del comprobante: ?numero=3F2A9C1B */
export async function GET(request: NextRequest) {
  const sesion = await exigirSesion(["empleado"]);
  if (sesion instanceof NextResponse) return sesion;
  const numero = request.nextUrl.searchParams.get("numero") ?? "";
  const venta = await buscarVentaParaDevolucion(numero);
  if (!venta) {
    return NextResponse.json(
      { error: "No hay ninguna venta con ese número. Revisa el comprobante." },
      { status: 404 },
    );
  }
  return NextResponse.json(venta);
}
