import type { Precio } from "./tramite";

/** Variante con precio fijo de un servicio (ej. Office "6 meses" Q 150, "1 año" Q 250). */
export interface OpcionServicio {
  id: string;
  nombre: string;
  precio: number;
}

/**
 * Servicio técnico que ofrece Oscar (sección 13). Tiene precio fijo, opciones con precio
 * (`opciones`) o ninguno (`precio.monto: null`): en ese caso Oscar dice cuánto cobrar al revisar.
 */
export interface ServicioTecnico {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: Precio;
  opciones?: OpcionServicio[];
  /** Nombre del ícono de Lucide para la tarjeta (ej. "cctv"). */
  icono?: string;
}

/** Tipos de equipo que el Empleado puede registrar en una entrada de servicio (pantalla 9). */
export const TIPOS_EQUIPO = ["Laptop", "PC", "Celular", "Impresora", "Cámara", "Otro"] as const;
export type TipoEquipo = (typeof TIPOS_EQUIPO)[number];
