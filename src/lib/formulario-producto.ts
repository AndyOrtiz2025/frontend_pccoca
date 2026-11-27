import "server-only";
import { MAX_BYTES_FOTO } from "@/lib/api";
import { productoSchema, type ProductoInput } from "@/schemas/producto.schema";

export type FormularioProducto =
  | { ok: true; datos: ProductoInput; foto?: Uint8Array | null }
  | { ok: false; error: string; status: number };

/**
 * Lee el formulario multipart de "Nuevo / Editar producto":
 * - `datos`: JSON con los campos (se valida con productoSchema).
 * - `foto`: imagen opcional (el tipo real lo revisa el servidor al guardarla).
 * - `quitarFoto`: "1" para quitar la foto actual al editar.
 */
export async function leerFormularioProducto(request: Request): Promise<FormularioProducto> {
  const largo = Number(request.headers.get("content-length") ?? 0);
  if (largo > MAX_BYTES_FOTO + 64 * 1024) {
    return { ok: false, error: "La foto pesa más de 2 MB", status: 413 };
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return { ok: false, error: "Formulario inválido", status: 400 };
  }
  let json: unknown;
  try {
    json = JSON.parse(String(form.get("datos") ?? ""));
  } catch {
    return { ok: false, error: "Formulario inválido", status: 400 };
  }
  const datos = productoSchema.safeParse(json);
  if (!datos.success) {
    return { ok: false, error: datos.error.issues[0]?.message ?? "Datos inválidos", status: 400 };
  }
  const archivo = form.get("foto");
  let foto: Uint8Array | null | undefined;
  if (archivo instanceof File && archivo.size > 0) {
    if (archivo.size > MAX_BYTES_FOTO) {
      return { ok: false, error: "La foto pesa más de 2 MB", status: 413 };
    }
    foto = new Uint8Array(await archivo.arrayBuffer());
  } else if (form.get("quitarFoto") === "1") {
    foto = null;
  }
  return { ok: true, datos: datos.data, foto };
}
