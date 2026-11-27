import type { Rol } from "@/lib/auth/roles";
import type { EstadoProceso } from "@/types/estados";
import type { Cobro, EnProceso } from "@/types/proceso";
import type { ServicioTecnico } from "@/types/servicio";
import { centavos } from "./dinero";

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

/** Lo que falta cobrar al entregar: total menos lo que el cliente ya dejó. */
export function porCobrar(cobro: Cobro): number {
  return Math.max(0, centavos(cobro.total - (cobro.anticipo ?? 0)));
}

/**
 * Precio de un servicio según el catálogo:
 * - Con opciones: el de la opción elegida (es obligatorio elegir una).
 * - Con precio fijo: ese precio.
 * - Sin precio o con rango: `undefined`, Oscar dice cuánto cobrar al revisar.
 * Lanza un error con mensaje para el usuario si la opción no es válida.
 */
export function cobroDeServicio(servicio: ServicioTecnico, opcionId?: string): Cobro | undefined {
  if (servicio.opciones?.length) {
    const opcion = servicio.opciones.find((o) => o.id === opcionId);
    if (!opcion) throw new Error(`Elige una opción de "${servicio.nombre}"`);
    return { total: opcion.precio, detalle: `${servicio.nombre} · ${opcion.nombre}` };
  }
  if (opcionId) throw new Error(`"${servicio.nombre}" no tiene opciones`);
  const { monto, montoMax } = servicio.precio;
  if (monto === null || montoMax !== undefined) return undefined;
  return { total: monto, detalle: servicio.nombre };
}
