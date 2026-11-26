import type { Precio } from "./tramite";

/** Servicio técnico que ofrece Oscar (sección 13). */
export interface ServicioTecnico {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: Precio;
  /** Nombre del ícono de Lucide para la tarjeta (ej. "cctv"). */
  icono?: string;
}

/** Tipos de equipo que el Empleado puede registrar en una entrada de servicio (pantalla 9). */
export const TIPOS_EQUIPO = ["Laptop", "PC", "Celular", "Impresora", "Cámara", "Otro"] as const;
export type TipoEquipo = (typeof TIPOS_EQUIPO)[number];
