import { NextResponse, type NextRequest } from "next/server";
import type { ArchivoEntrante } from "@/lib/api";
import { subirArchivosCliente } from "@/lib/api-clientes";
import { MAX_ARCHIVOS, MAX_BYTES_ARCHIVO } from "@/lib/archivos";
import { exigirSesion, respuestaDeError } from "@/lib/auth/respuestas";

/** Subir archivos del cliente (multipart: "archivos", hasta 5 por vez, 5 MB cada uno). */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/clientes/[id]/archivos">) {
  const sesion = await exigirSesion(["paola"]);
  if (sesion instanceof NextResponse) return sesion;
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const files = form.getAll("archivos").filter((f): f is File => f instanceof File);
  if (files.length > MAX_ARCHIVOS) {
    return NextResponse.json({ error: `Máximo ${MAX_ARCHIVOS} archivos por vez` }, { status: 400 });
  }
  const archivos: ArchivoEntrante[] = [];
  for (const f of files) {
    // Se revisa el tamaño ANTES de leer el archivo a memoria.
    if (f.size > MAX_BYTES_ARCHIVO) {
      return NextResponse.json({ error: `${f.name}: pesa más de 5 MB` }, { status: 413 });
    }
    archivos.push({ nombre: f.name, datos: new Uint8Array(await f.arrayBuffer()) });
  }
  const { id } = await ctx.params;
  try {
    const subidos = await subirArchivosCliente(sesion.rol, id, archivos);
    return NextResponse.json({ archivos: subidos }, { status: 201 });
  } catch (e) {
    return respuestaDeError(e);
  }
}
