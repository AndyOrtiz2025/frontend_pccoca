import { NextResponse } from "next/server";
import { crearProveedor } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { proveedorSchema } from "@/schemas/proveedor.schema";

/** Nuevo proveedor (Paola u Oscar). */
export async function POST(request: Request) {
  const sesion = await exigirSesion(["paola", "oscar"]);
  if (sesion instanceof NextResponse) return sesion;
  const datos = proveedorSchema.safeParse(await request.json().catch(() => null));
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
    const p = await crearProveedor(sesion.rol, datos.data);
    return NextResponse.json({ id: p.id }, { status: 201 });
  } catch (e) {
    return respuestaDeError(e);
  }
}
