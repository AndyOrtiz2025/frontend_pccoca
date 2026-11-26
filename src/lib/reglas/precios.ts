import type { Presentacion, Producto, ProductoVenta } from "@/types/producto";
import { centavos } from "./dinero";

type ProductoConPrecio = Pick<
  Producto | ProductoVenta,
  "categoria" | "precio" | "mayoreo" | "fraccionable"
>;

export interface PrecioCalculado {
  /** Precio por unidad (o por paquete) que se cobra. */
  unitario: number;
  /** Precio normal, sin mayoreo. */
  normal: number;
  /** true si se aplicó el descuento por volumen. */
  mayoreo: boolean;
}

/** El descuento por volumen solo existe en Librería y Productos Varios (sección 11.2). */
export function admiteMayoreo(producto: Pick<Producto, "categoria">): boolean {
  return producto.categoria !== "tecnologia";
}

/**
 * Precio que se cobra según presentación y cantidad.
 * - Por paquete: precio del paquete, sin mayoreo.
 * - Por unidad: precio normal; a partir de `mayoreo.desde` unidades, el precio de mayoreo.
 */
export function calcularPrecio(
  producto: ProductoConPrecio,
  presentacion: Presentacion,
  cantidad: number,
): PrecioCalculado {
  if (presentacion === "paquete") {
    if (!producto.fraccionable) throw new Error("Este producto no se vende por paquete");
    const p = producto.fraccionable.precioPaquete;
    return { unitario: p, normal: p, mayoreo: false };
  }

  const normal = producto.precio;
  const m = producto.mayoreo;
  if (m && admiteMayoreo(producto) && cantidad >= m.desde && m.precio < normal) {
    return { unitario: m.precio, normal, mayoreo: true };
  }
  return { unitario: normal, normal, mayoreo: false };
}

export interface Margen {
  ganancia: number;
  /** Porcentaje sobre el precio de venta (ej. 45 = 45%). */
  porcentaje: number;
}

/** Ganancia esperada = precio de venta − costo (sección 11.6). Solo para Paola y Oscar. */
export function calcularMargen(precio: number, costo: number | undefined): Margen | null {
  if (costo === undefined || precio <= 0) return null;
  const ganancia = centavos(precio - costo);
  return { ganancia, porcentaje: Math.round((ganancia / precio) * 100) };
}
