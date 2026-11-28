import { nombrePaquete } from "@/lib/presentacion";
import type {
  Comprobante,
  LineaCarrito,
  LineaComprobante,
  TipoMovimiento,
} from "@/types/movimiento";
import type { Presentacion, ProductoVenta } from "@/types/producto";
import { centavos } from "./dinero";
import { calcularPrecio } from "./precios";

type ProductoCarrito = Pick<
  ProductoVenta,
  | "id"
  | "codigo"
  | "nombre"
  | "categoria"
  | "precio"
  | "mayoreo"
  | "fraccionable"
  | "aplicaConsumoInterno"
>;

/** Qué tipos de movimiento se ofrecen para un producto (secciones 8.7 y 11.4). */
export function tiposPermitidos(
  producto: Pick<ProductoCarrito, "categoria" | "aplicaConsumoInterno">,
): TipoMovimiento[] {
  const tipos: TipoMovimiento[] = ["venta"];
  if (producto.aplicaConsumoInterno && producto.categoria !== "varios")
    tipos.push("consumo_interno");
  tipos.push("merma");
  return tipos;
}

export function presentacionesPermitidas(
  producto: Pick<ProductoCarrito, "fraccionable">,
): Presentacion[] {
  return producto.fraccionable ? ["unidad", "paquete"] : ["unidad"];
}

/** Dos líneas son "la misma" si coinciden producto, tipo y presentación: se suman en vez de duplicarse. */
function mismaLinea(a: LineaCarrito, b: LineaCarrito) {
  return a.productoId === b.productoId && a.tipo === b.tipo && a.presentacion === b.presentacion;
}

/** Valida la línea contra las reglas del producto. Devuelve el mensaje de error o null. */
export function validarLinea(linea: LineaCarrito, producto: ProductoCarrito): string | null {
  if (!Number.isInteger(linea.cantidad) || linea.cantidad <= 0)
    return "La cantidad debe ser mayor a 0";
  if (!tiposPermitidos(producto).includes(linea.tipo))
    return "Este producto no aplica a consumo interno";
  if (!presentacionesPermitidas(producto).includes(linea.presentacion)) {
    return "Este producto no se vende por paquete";
  }
  if (linea.tipo === "merma" && !linea.motivo?.trim())
    return "El motivo de la merma es obligatorio";
  return null;
}

/** Agrega una línea (o suma la cantidad si ya existe) sin modificar el carrito original. */
export function agregarLinea(carrito: LineaCarrito[], nueva: LineaCarrito): LineaCarrito[] {
  const i = carrito.findIndex((l) => mismaLinea(l, nueva));
  if (i === -1) return [...carrito, nueva];
  return carrito.map((l, j) =>
    j === i ? { ...l, cantidad: l.cantidad + nueva.cantidad, motivo: nueva.motivo ?? l.motivo } : l,
  );
}

export function cambiarCantidad(
  carrito: LineaCarrito[],
  indice: number,
  cantidad: number,
): LineaCarrito[] {
  if (cantidad <= 0) return carrito.filter((_, j) => j !== indice);
  return carrito.map((l, j) => (j === indice ? { ...l, cantidad } : l));
}

export interface LineaCalculada extends LineaCarrito {
  producto: ProductoCarrito;
  precioUnitario: number;
  precioNormal: number;
  mayoreo: boolean;
  /** Solo las ventas tienen subtotal; consumo interno y merma valen Q 0.00 para la venta. */
  subtotal: number;
}

export interface CarritoCalculado {
  lineas: LineaCalculada[];
  /** Total que paga el cliente (solo líneas de venta). */
  total: number;
  /** Avisos de "cambió de Q__ a Q__ por compra al por mayor". */
  avisosMayoreo: { nombre: string; de: number; a: number }[];
  cantidadVentas: number;
  cantidadConsumos: number;
  cantidadMermas: number;
}

export function calcularCarrito(
  carrito: LineaCarrito[],
  productos: Map<string, ProductoCarrito>,
): CarritoCalculado {
  const lineas: LineaCalculada[] = [];
  for (const l of carrito) {
    const producto = productos.get(l.productoId);
    if (!producto) continue;
    const precio = calcularPrecio(producto, l.presentacion, l.cantidad);
    lineas.push({
      ...l,
      producto,
      precioUnitario: precio.unitario,
      precioNormal: precio.normal,
      mayoreo: precio.mayoreo,
      subtotal: l.tipo === "venta" ? centavos(precio.unitario * l.cantidad) : 0,
    });
  }

  return {
    lineas,
    total: centavos(lineas.reduce((s, l) => s + l.subtotal, 0)),
    avisosMayoreo: lineas
      .filter((l) => l.tipo === "venta" && l.mayoreo)
      .map((l) => ({ nombre: l.producto.nombre, de: l.precioNormal, a: l.precioUnitario })),
    cantidadVentas: lineas.filter((l) => l.tipo === "venta").length,
    cantidadConsumos: lineas.filter((l) => l.tipo === "consumo_interno").length,
    cantidadMermas: lineas.filter((l) => l.tipo === "merma").length,
  };
}

/**
 * Comprobante de venta interno (sección 11.3): solo las líneas de venta.
 * Consumo interno y merma no generan comprobante. Devuelve null si no hay ventas.
 */
export function generarComprobante(
  calculado: CarritoCalculado,
  datos: { id: string; fecha: string; atendio: string; usuario: string },
): Comprobante | null {
  const lineas: LineaComprobante[] = calculado.lineas
    .filter((l) => l.tipo === "venta")
    .map((l) => ({
      productoId: l.productoId,
      codigo: l.producto.codigo,
      nombre: l.producto.nombre,
      presentacion: l.presentacion,
      ...(l.presentacion === "paquete" && { nombrePaquete: nombrePaquete(l.producto) }),
      cantidad: l.cantidad,
      precioUnitario: l.precioUnitario,
      subtotal: l.subtotal,
    }));
  if (lineas.length === 0) return null;
  return { ...datos, lineas, total: calculado.total };
}
