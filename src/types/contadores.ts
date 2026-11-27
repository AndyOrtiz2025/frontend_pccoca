import type { ClaveContador } from "@/lib/navegacion";

/** Números de los badges del menú y de la campanita. Los calcula obtenerContadores() en lib/api.ts. */
export type Contadores = Partial<Record<ClaveContador | "notificaciones", number>>;
