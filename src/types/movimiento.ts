import type { Presentacion } from "./producto";

/**
 * Tipos de movimiento de stock (secciones 8.7, 11.4 y 11.7):
 * - venta: ingreso, genera comprobante.
 * - consumo_interno: el negocio usa su insumo; descuenta stock, va a "Gastos de insumos".
 * - merma: producto dañado o vencido; descuenta stock, no es ingreso ni gasto. Motivo obligatorio.
 */
export type TipoMovimiento = "venta" | "consumo_interno" | "merma";

export const ETIQUETA_MOVIMIENTO: Record<TipoMovimiento, string> = {
  venta: "Venta",
  consumo_interno: "Consumo interno",
  merma: "Merma",
};

/** Una línea del carrito, tal como la arma el Empleado. */
export interface LineaCarrito {
  productoId: string;
  tipo: TipoMovimiento;
  presentacion: Presentacion;
  cantidad: number;
  /** Obligatorio en merma; opcional en consumo interno. */
  motivo?: string;
}

/** Línea del comprobante de venta interno (sección 11.3). */
export interface LineaComprobante {
  codigo: string;
  nombre: string;
  presentacion: Presentacion;
  /** Si se vendió por paquete: cómo se llama ("Caja", "Bolsa"…), para el comprobante. */
  nombrePaquete?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

/** Comprobante de venta interno: consumidor final, sin NIT, con fecha y hora (sección 11.3). */
export interface Comprobante {
  id: string;
  fecha: string;
  /** Nombre que se imprime: "Atendió: Carlos". */
  atendio: string;
  /** Usuario que vendió; con él cada empleado ve solo sus ventas. */
  usuario: string;
  lineas: LineaComprobante[];
  total: number;
}
