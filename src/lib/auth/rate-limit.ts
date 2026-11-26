import "server-only";

/**
 * Límite de intentos de login (guía, sección Seguridad): 5 intentos fallidos
 * por IP y por usuario bloquean durante 15 minutos.
 * Vive en memoria del servidor; el backend tendrá su propio límite, que es el que protege de verdad.
 */
const MAX_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000;

const intentos = new Map<string, { fallos: number; desde: number }>();

function vigente(clave: string, ahora: number) {
  const reg = intentos.get(clave);
  if (!reg) return null;
  if (ahora - reg.desde > VENTANA_MS) {
    intentos.delete(clave);
    return null;
  }
  return reg;
}

export function estaBloqueado(claves: string[], ahora = Date.now()): boolean {
  return claves.some((c) => (vigente(c, ahora)?.fallos ?? 0) >= MAX_INTENTOS);
}

export function registrarFallo(claves: string[], ahora = Date.now()) {
  for (const c of claves) {
    const reg = vigente(c, ahora);
    intentos.set(c, reg ? { ...reg, fallos: reg.fallos + 1 } : { fallos: 1, desde: ahora });
  }
}

export function limpiarIntentos(claves: string[]) {
  for (const c of claves) intentos.delete(c);
}
