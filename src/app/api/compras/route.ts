import { NextResponse } from "next/server";
import { registrarCompra } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { compraSchema } from "@/schemas/proveedor.schema";

/** Registrar compra: suma stock, actualiza el costo y deja reclamos por lo dañado. */
export async function POST(request: Request) {
  const sesion = await exigirSesion(["paola", "oscar"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = compraSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json(
      {
        error: datos.error.issues[0]?.message ?? "Datos inválidos",
        campo: datos.error.issues[0]?.path.join("."),
      },
      { status: 400 },
    );
  }
  try {
    const r = await registrarCompra(sesion.rol, datos.data, sesion.nombre);
    return NextResponse.json(
      { id: r.compra.id, total: r.compra.total, avisos: r.avisos, reclamos: r.reclamos },
      { status: 201 },
    );
  } catch (e) {
    return respuestaDeError(e);
  }
}
