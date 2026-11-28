import type { LineaComprobante } from "./movimiento";

/** Días que tiene el cliente para devolver; después, solo con autorización de Paola u Oscar. */
export const PLAZO_DEVOLUCION_DIAS = 3;

/**
 * Cómo viene lo que devuelve el cliente:
 * - buen_estado: vuelve al stock.
 * - defectuoso: no vuelve al stock; se le reclama al proveedor.
 */
export type EstadoDevuelto = "buen_estado" | "defectuoso";

export const ETIQUETA_ESTADO_DEVUELTO: Record<EstadoDevuelto, string> = {
  buen_estado: "Buen estado",
  defectuoso: "Defectuoso",
};

export interface LineaDevuelta extends LineaComprobante {
  productoId: string;
  estado: EstadoDevuelto;
  /** Qué tenía (defectuoso) o por qué lo devuelve. */
  nota?: string;
}

/**
 * Devolución de un cliente. Nunca se devuelve dinero: lo devuelto queda como saldo a favor que se
 * usa completo en lo que se lleva (el mismo producto u otro); si se pasa, paga la diferencia.
 */
export interface Devolucion {
  id: string;
  fecha: string;
  atendio: string;
  usuario: string;
  /** Venta original, si trajo comprobante. */
  comprobanteId?: string;
  numeroCompra?: string;
  /** Día en que compró (AAAA-MM-DD, hora de Guatemala). */
  fechaCompra: string;
  /** Días que pasaron desde la compra. */
  dias: number;
  /** Fuera de plazo: quién lo autorizó y por qué. */
  autorizo?: { por: "Paola" | "Oscar"; motivo: string };
  devuelto: LineaDevuelta[];
  /** Saldo a favor: lo que vale lo devuelto. */
  saldo: number;
  llevo: LineaComprobante[];
  totalLlevo: number;
  /** Lo que pagó el cliente porque se llevó más de su saldo (0 si quedó exacto). */
  diferencia: number;
}
