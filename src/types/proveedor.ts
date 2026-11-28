import type { Categoria, Presentacion } from "./producto";

/** Días de la semana (0 = domingo), para "Pasa los martes y viernes". */
export const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

/** Proveedor de productos (pantallas 17 y 18). Nunca se borra: se inactiva. */
export interface Proveedor {
  id: string;
  nombre: string;
  nit?: string;
  /** Persona con quien se trata (vendedor, representante). */
  contacto?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  /** Días en que pasa a dejar pedidos (0 = domingo … 6 = sábado). */
  diasVisita?: number[];
  /** Qué líneas surte: Librería, Varios y/o Tecnología. */
  surte: Categoria[];
  notas?: string;
  activo: boolean;
}

/** Una línea de la compra: lo que llegó bueno y lo que llegó dañado. */
export interface LineaCompra {
  productoId: string;
  /** Por caja/paquete o por unidad. */
  presentacion: Presentacion;
  /** Lo que entra al stock. */
  cantidad: number;
  /** Lo que llegó dañado: no entra al stock y queda como reclamo al proveedor. */
  danadas: number;
  /** Costo de una unidad o de una caja, según la presentación. */
  costoUnitario: number;
  /** Lo que se pagó por la línea (buenas + dañadas). */
  subtotal: number;
}

/** Compra al proveedor (pantalla 19): la llegada de mercadería. Siempre al contado. */
export interface Compra {
  id: string;
  proveedorId: string;
  /** Fecha y hora en que se recibió. */
  fecha: string;
  /** Número de factura o envío del proveedor (opcional). */
  factura?: string;
  lineas: LineaCompra[];
  total: number;
  registradoPor: string;
}

export type EstadoReclamo = "pendiente" | "repuesto" | "reembolsado" | "perdida";

export const ETIQUETA_RECLAMO: Record<EstadoReclamo, string> = {
  pendiente: "Pendiente",
  repuesto: "Nos repusieron",
  reembolsado: "Nos devolvieron el dinero",
  perdida: "Pérdida",
};

/**
 * Producto dañado que se le reclama al proveedor (llegó así en una compra; luego también
 * los defectuosos que devuelvan los clientes). Se resuelve con reposición, reembolso o pérdida.
 */
export interface Reclamo {
  id: string;
  proveedorId: string;
  compraId?: string;
  /** Defectuoso que devolvió un cliente. */
  devolucionId?: string;
  productoId: string;
  presentacion: Presentacion;
  cantidad: number;
  /** Lo que costó cada uno: sirve para el reembolso y para calcular la pérdida. */
  costoUnitario: number;
  motivo?: string;
  fecha: string;
  estado: EstadoReclamo;
  resolucion?: { fecha: string; por: string; monto?: number; nota?: string };
}
