import type { NivelStock } from "@/lib/stock";

/** Las tres líneas de producto (documentación, sección 5). */
export type Categoria = "libreria" | "tecnologia" | "varios";

export const ETIQUETA_CATEGORIA: Record<Categoria, string> = {
  libreria: "Librería",
  tecnologia: "Tecnología",
  varios: "Productos Varios",
};

/** Prefijo del código interno por categoría (ej. LIB-0034). */
export const PREFIJO_CODIGO: Record<Categoria, string> = {
  libreria: "LIB",
  tecnologia: "TEC",
  varios: "VAR",
};

/** Cómo se vende: por unidad suelta o por paquete cerrado (sección 11.5). */
export type Presentacion = "unidad" | "paquete";

/**
 * Descuento por volumen (sección 11.2): a partir de `desde` unidades, el precio por unidad baja a `precio`.
 * Solo Librería y Productos Varios. Tecnología tiene precios fijos.
 */
export interface Mayoreo {
  desde: number;
  precio: number;
}

/**
 * Datos extra de un producto que se compra empaquetado y se vende también suelto (sección 11.5).
 * Ej. lápiz Mongol: caja de 12 a Q 18, se vende la caja a Q 22 (Q 20 desde 5 cajas) y el lápiz a Q 2.
 */
export interface Fraccionable {
  unidadesPorPaquete: number;
  /** Cómo se llama el paquete de este producto: "Caja", "Bolsa", "Resma"… (por defecto "Paquete"). */
  nombrePaquete?: string;
  /** Precio del paquete cerrado. El precio por unidad es `Producto.precio`. */
  precioPaquete: number;
  /** Mayoreo por paquete: a partir de `desde` paquetes, cada uno cuesta `precio`. */
  mayoreoPaquete?: Mayoreo;
  /**
   * Costo del paquete al proveedor (dato sensible). El costo por unidad (`Producto.costo`) se
   * calcula de aquí: costoPaquete ÷ unidadesPorPaquete.
   */
  costoPaquete?: number;
}

/**
 * Stock del producto.
 * - Simple: un solo contador.
 * - Fraccionable: paquetes cerrados + unidades sueltas del paquete abierto (dos contadores separados).
 * `referencia` es el "total registrado" contra el que se calcula el semáforo (en unidades, o en paquetes).
 */
export type Stock =
  | { tipo: "simple"; disponible: number; referencia: number }
  | { tipo: "fraccionable"; paquetes: number; sueltas: number; referenciaPaquetes: number };

/** Producto completo: lo que ven Paola (Librería/Varios) y Oscar (Tecnología). */
export interface Producto {
  id: string;
  /** Código interno único, ej. "LIB-0034". Se busca de forma exacta. */
  codigo: string;
  /** Código que lee el escáner. Por defecto es el mismo `codigo`; puede ser el EAN del fabricante. */
  codigoBarras: string;
  nombre: string;
  descripcion?: string;
  imagenUrl?: string;
  categoria: Categoria;
  subcategoria?: string;
  /** Precio normal por unidad (o por pieza si no es fraccionable). */
  precio: number;
  mayoreo?: Mayoreo;
  /** Costo de compra por unidad al proveedor. Dato sensible: el Empleado nunca lo recibe (sección 11.6). */
  costo?: number;
  /** Si se puede marcar como Consumo interno (sección 11.4). Nunca en Productos Varios. */
  aplicaConsumoInterno: boolean;
  fraccionable?: Fraccionable;
  stock: Stock;
  proveedorId?: string;
  activo: boolean;
}

/**
 * Lo que recibe el Empleado: sin costo, sin margen y sin cantidades exactas,
 * solo el semáforo y avisos para "Abrir nuevo paquete" (sección 8.1 y 11.1).
 */
export interface ProductoVenta extends Omit<
  Producto,
  "costo" | "stock" | "fraccionable" | "proveedorId"
> {
  fraccionable?: Omit<Fraccionable, "costoPaquete">;
  disponibilidad: {
    nivel: NivelStock;
    agotado: boolean;
    /** Fraccionables: no quedan unidades sueltas (hay que abrir un paquete). */
    sinSueltas?: boolean;
    /** Fraccionables: no quedan paquetes cerrados. */
    sinPaquetes?: boolean;
  };
}
