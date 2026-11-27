/** Descarga un archivo generado en el navegador (ej. el PDF del comprobante). */
export function descargarArchivo(archivo: Blob, nombre: string) {
  const url = URL.createObjectURL(archivo);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Se libera después: algunos navegadores todavía están leyendo el archivo.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export type ResultadoCompartir = "compartido" | "cancelado" | "descargado";

/**
 * Abre el menú de compartir del teléfono o de Windows (WhatsApp, correo…) con el archivo.
 * Si el navegador no puede compartir archivos, lo descarga para enviarlo a mano.
 */
export async function compartirArchivo(
  archivo: Blob,
  nombre: string,
  texto: { titulo: string; mensaje: string },
): Promise<ResultadoCompartir> {
  const file = new File([archivo], nombre, { type: archivo.type || "application/pdf" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: texto.titulo, text: texto.mensaje });
      return "compartido";
    } catch (e) {
      // AbortError: la persona cerró el menú de compartir.
      if ((e as DOMException).name === "AbortError") return "cancelado";
    }
  }
  descargarArchivo(archivo, nombre);
  return "descargado";
}
