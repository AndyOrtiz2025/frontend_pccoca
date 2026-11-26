import type { Rol } from "@/lib/auth/roles";
import type { EstadoProceso } from "@/types/estados";
import type { EnProceso } from "@/types/proceso";

/** Orden del flujo: Recibido → En proceso → Listo para entregar → Entregado (sección 11.8). */
export const ORDEN_ESTADOS: EstadoProceso[] = ["recibido", "en_proceso", "listo", "entregado"];

/**
 * A qué estados puede cambiar cada rol (sección 11.8):
 * - Paola (trámites) y Oscar (servicios): Recibido, En proceso y Listo para entregar, con un clic.
 * - Empleado: solo de Listo para entregar a Entregado, cuando el cliente recoge.
 * Un proceso entregado ya no cambia.
 */
export function estadosDisponibles(
  rol: Rol,
  proceso: Pick<EnProceso, "estado" | "responsable">,
): EstadoProceso[] {
  if (proceso.estado === "entregado") return [];
  if (rol === "empleado") return proceso.estado === "listo" ? ["entregado"] : [];
  if (rol !== proceso.responsable) return [];
  return (["recibido", "en_proceso", "listo"] as EstadoProceso[]).filter(
    (e) => e !== proceso.estado,
  );
}

export function puedeCambiarEstado(
  rol: Rol,
  proceso: Pick<EnProceso, "estado" | "responsable">,
  nuevo: EstadoProceso,
): boolean {
  return estadosDisponibles(rol, proceso).includes(nuevo);
}

/** Al pasar a "Listo para entregar" se notifica a todos los empleados (sección 8.11). */
export function notificaEmpleados(nuevo: EstadoProceso): boolean {
  return nuevo === "listo";
}
