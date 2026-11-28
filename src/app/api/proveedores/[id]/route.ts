import { NextResponse } from "next/server";
import { editarProveedor } from "@/lib/api";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { proveedorSchema } from "@/schemas/proveedor.schema";

/** Editar los datos del proveedor. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/proveedores/[id]">) {
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
  const { id } = await ctx.params;
  try {
    await editarProveedor(sesion.rol, id, datos.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaDeError(e);
  }
}
