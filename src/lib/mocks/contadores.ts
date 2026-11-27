import type { Rol } from "@/lib/auth/roles";
import type { ClaveContador } from "@/lib/navegacion";

export type Contadores = Partial<Record<ClaveContador | "notificaciones", number>>;

/**
 * Contadores de prueba (badges del menú y de la campanita).
 * TODO(backend): se reemplazan por GET /api/contadores cuando exista el backend.
 */
export const CONTADORES_DEMO: Record<Rol, Contadores> = {
  // El contador del carrito del Empleado es real: sale del carrito (VentaContext).
  empleado: { pendientes: 4, notificaciones: 2 },
  paola: { entradas: 3, comentarios: 2, notificaciones: 3 },
  oscar: { entradas: 2, comentarios: 1, notificaciones: 2 },
};
