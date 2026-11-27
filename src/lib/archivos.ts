import type { ArchivoAdjunto } from "@/types/entrada";

/** Límites de archivos por entrada de trámite. */
export const MAX_ARCHIVOS = 5;
export const MAX_BYTES_ARCHIVO = 5 * 1024 * 1024; // 5 MB
export const EXTENSIONES_ACEPTADAS = ".pdf,.jpg,.jpeg,.png,.webp";

type TipoPermitido = ArchivoAdjunto["tipo"];

/**
 * Detecta el tipo REAL por los primeros bytes ("firma" del archivo), no por la extensión
 * ni por lo que diga el navegador. Así un .exe renombrado a .pdf se rechaza.
 */
export function detectarTipo(bytes: Uint8Array): TipoPermitido | null {
  const inicia = (...firma: number[]) => firma.every((b, i) => bytes[i] === b);
  if (inicia(0x25, 0x50, 0x44, 0x46, 0x2d)) return "application/pdf"; // %PDF-
  if (inicia(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (inicia(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (
    inicia(0x52, 0x49, 0x46, 0x46) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp"; // RIFF....WEBP
  }
  return null;
}

/** Nombre seguro: sin rutas, sin caracteres de control y de largo limitado. */
export function nombreSeguro(nombre: string): string {
  const base = nombre.split(/[\\/]/).pop() ?? "";
  const limpio = base.replace(/[\u0000-\u001f\u007f"<>|:*?]/g, "").trim();
  return (limpio || "archivo").slice(0, 100);
}

/** Validación rápida en el navegador (el servidor vuelve a validar todo). */
export function validarArchivoCliente(archivo: { name: string; size: number }): string | null {
  if (archivo.size > MAX_BYTES_ARCHIVO) return `${archivo.name}: pesa más de 5 MB`;
  if (!/\.(pdf|jpe?g|png|webp)$/i.test(archivo.name))
    return `${archivo.name}: solo PDF, JPG, PNG o WEBP`;
  return null;
}
