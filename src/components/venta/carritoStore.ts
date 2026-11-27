import type { LineaCarrito } from "@/types/movimiento";

/**
 * Carrito guardado en sessionStorage: sobrevive a navegar y a recargar la página,
 * pero es de esta pestaña y se pierde al cerrarla. No guarda precios: solo qué y cuánto.
 * Se usa con useSyncExternalStore para no romper la hidratación de React.
 */
type Oyente = () => void;

const VACIO: LineaCarrito[] = [];
const oyentes = new Set<Oyente>();
let clave = "";
let cache: LineaCarrito[] = VACIO;

function leer(k: string): LineaCarrito[] {
  try {
    const crudo = sessionStorage.getItem(k);
    const datos: unknown = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(datos) ? (datos as LineaCarrito[]) : VACIO;
  } catch {
    return VACIO;
  }
}

export const carritoStore = {
  /** Cambia de usuario (cada empleado tiene su propio carrito en la pestaña). */
  usar(usuario: string) {
    const nueva = `pccoca_carrito_${usuario}`;
    if (nueva === clave) return;
    clave = nueva;
    cache = leer(clave);
    oyentes.forEach((o) => o());
  },
  get: () => cache,
  getServidor: () => VACIO,
  set(lineas: LineaCarrito[]) {
    cache = lineas;
    try {
      sessionStorage.setItem(clave, JSON.stringify(lineas));
    } catch {
      // Sin almacenamiento (modo privado estricto): el carrito vive solo en memoria.
    }
    oyentes.forEach((o) => o());
  },
  subscribe(o: Oyente) {
    oyentes.add(o);
    return () => oyentes.delete(o);
  },
};
