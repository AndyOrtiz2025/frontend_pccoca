import { NextResponse, type NextRequest } from "next/server";
import { crearEntradaTramite, type ArchivoEntrante } from "@/lib/api";
import { MAX_ARCHIVOS, MAX_BYTES_ARCHIVO } from "@/lib/archivos";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";
import { entradaTramiteSchema } from "@/schemas/entrada.schema";

/**
 * El Empleado registra lo que antes mandaba por WhatsApp a Paola.
 * Llega como multipart/form-data: "datos" (JSON) + "archivos" (hasta 5, de 5 MB cada uno).
 */
export async function POST(request: NextRequest) {
  const sesion = await exigirSesion(["empleado"]);
  if (sesion instanceof NextResponse) return sesion;

  let crudo: unknown = null;
  const archivos: ArchivoEntrante[] = [];
  const tipo = request.headers.get("content-type") ?? "";

  if (tipo.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    try {
      crudo = JSON.parse(String(form.get("datos") ?? "null"));
    } catch {
      crudo = null;
    }
    const files = form.getAll("archivos").filter((f): f is File => f instanceof File);
    if (files.length > MAX_ARCHIVOS) {
      return NextResponse.json(
        { error: `Máximo ${MAX_ARCHIVOS} archivos por entrada` },
        { status: 400 },
      );
    }
    for (const f of files) {
      // Se revisa el tamaño ANTES de leer el archivo a memoria.
      if (f.size > MAX_BYTES_ARCHIVO) {
        return NextResponse.json({ error: `${f.name}: pesa más de 5 MB` }, { status: 413 });
      }
      archivos.push({ nombre: f.name, datos: new Uint8Array(await f.arrayBuffer()) });
    }
  } else {
    crudo = await request.json().catch(() => null);
  }

  const datos = entradaTramiteSchema.safeParse(crudo);
  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  try {
    const entrada = await crearEntradaTramite(datos.data, sesion.nombre, archivos);
    return NextResponse.json({ entrada }, { status: 201 });
  } catch (e) {
    return respuestaDeError(e);
  }
}
