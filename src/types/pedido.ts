import type { Presentacion } from "./producto";

/**
 * Cómo está una línea del pedido:
 * - pendiente: todavía se espera (completa o lo que falta).
 * - completa: ya vino todo, o se decidió no esperar lo que faltaba.
 * - cancelada: "ya no se pide".
 * - movida: lo que faltaba se pasó a otro pedido (`movidaA`).
 */
export type EstadoLineaPedido = "pendiente" | "completa" | "cancelada" | "movida";

export interface LineaPedido {
  id: string;
  /** Sin productoId: es algo que todavía no tenemos; se crea el producto cuando llega. */
  productoId?: string;
  /** Nombre del producto nuevo (o copia del nombre al pedirlo). */
  nombre: string;
  presentacion: Presentacion;
  /** Lo que se pidió. */
  cantidad: number;
  /** Lo que ya vino (buenas + dañadas), sumando todas las revisiones. */
  recibidas: number;
  estado: EstadoLineaPedido;
  /** Número del pedido al que se pasó lo que faltaba. */
  movidaA?: string;
}

/** Cada vez que se revisa un paquete que llegó para este pedido. */
export interface RecepcionPedido {
  fecha: string;
  por: string;
  /** Compra que se registró (no hay si solo se tacharon cosas que no vinieron). */
  compraId?: string;
  total?: number;
  factura?: string;
}

/** Pedido al proveedor: la lista de lo que se va a pedir, que luego se revisa al llegar. */
export interface Pedido {
  id: string;
  /** Número corto para la hoja impresa: "P-0003". */
  numero: string;
  proveedorId: string;
  /** Quién lo administra: Paola (Librería y Varios) u Oscar (Tecnología). */
  admin: "paola" | "oscar";
  fecha: string;
  creadoPor: string;
  notas?: string;
  lineas: LineaPedido[];
  recepciones: RecepcionPedido[];
}

export type EstadoPedido = "pendiente" | "parcial" | "recibido" | "cancelado";

export const ETIQUETA_PEDIDO: Record<EstadoPedido, string> = {
  pendiente: "Por llegar",
  parcial: "Llegó una parte",
  recibido: "Recibido",
  cancelado: "Cancelado",
};
