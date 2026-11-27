import { diaDeGuatemala } from "@/lib/fechas";
import type { Comprobante } from "@/types/movimiento";
import { centavos } from "./dinero";

export interface ResumenVentas {
  total: number;
  /** Cuántos comprobantes (ventas). */
  cantidad: number;
  /** Suma de cantidades vendidas (unidades, paquetes y cajas). */
  unidades: number;
  /** Las más recientes primero. */
  ultimas: Comprobante[];
}

/**
 * Ventas de un empleado en el día de hoy según la hora de Guatemala: de 12:00 a. m. a 11:59 p. m.
 */
export function resumenVentasDelDia(
  comprobantes: Comprobante[],
  usuario: string,
  ahora = new Date(),
  maxUltimas = 5,
): ResumenVentas {
  const hoy = diaDeGuatemala(ahora);
  const mias = comprobantes
    .filter((c) => c.usuario === usuario && diaDeGuatemala(c.fecha) === hoy)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  return {
    total: centavos(mias.reduce((t, c) => t + c.total, 0)),
    cantidad: mias.length,
    unidades: mias.reduce((t, c) => t + c.lineas.reduce((u, l) => u + l.cantidad, 0), 0),
    ultimas: mias.slice(0, maxUltimas),
  };
}
