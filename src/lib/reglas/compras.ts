import { calcularMargen } from "@/lib/reglas/precios";
import type { Presentacion, Producto, Stock } from "@/types/producto";
import type { LineaCompra } from "@/types/proveedor";
import { centavos } from "./dinero";

/** Suma al stock lo que llegó bueno, en su presentación. */
export function sumarAlStock(stock: Stock, presentacion: Presentacion, cantidad: number): Stock {
  if (stock.tipo === "simple") {
    if (presentacion === "paquete") throw new Error("Este producto no se maneja por caja");
    return { ...stock, disponible: stock.disponible + cantidad };
  }
  return presentacion === "paquete"
    ? { ...stock, paquetes: stock.paquetes + cantidad }
    : { ...stock, sueltas: stock.sueltas + cantidad };
}

export interface AvisoCosto {
  productoId: string;
  nombre: string;
  presentacion: Presentacion;
  antes: number;
  ahora: number;
  /** Ganancia con el precio actual y el costo nuevo (negativa = vende bajo el costo). */
  ganancia: number;
  porcentaje: number;
}

/**
 * Lo que hace una línea de compra en el producto:
 * - Suma al stock solo lo que llegó bueno.
 * - El costo pasa a ser el de esta compra ("último costo"). Por caja: costo de la caja y,
 *   de ahí, el costo por unidad (caja de 12 a Q 18 → Q 1.50).
 * - Si el costo cambió, devuelve un aviso con la ganancia que queda con el precio actual.
 */
export function aplicarCompra(
  producto: Producto,
  linea: Pick<LineaCompra, "presentacion" | "cantidad" | "costoUnitario">,
): { producto: Producto; aviso?: AvisoCosto } {
  const f = producto.fraccionable;
  const stock = sumarAlStock(producto.stock, linea.presentacion, linea.cantidad);
  const costo = centavos(linea.costoUnitario);

  if (linea.presentacion === "paquete" && f) {
    const antes = f.costoPaquete;
    const nuevo: Producto = {
      ...producto,
      stock,
      fraccionable: { ...f, costoPaquete: costo },
      costo: centavos(costo / f.unidadesPorPaquete),
    };
    const m = calcularMargen(f.precioPaquete, costo)!;
    return {
      producto: nuevo,
      aviso:
        antes !== undefined && antes !== costo
          ? {
              productoId: producto.id,
              nombre: producto.nombre,
              presentacion: "paquete",
              antes,
              ahora: costo,
              ganancia: m.ganancia,
              porcentaje: m.porcentaje,
            }
          : undefined,
    };
  }

  const antes = producto.costo;
  const nuevo: Producto = { ...producto, stock, costo };
  const m = calcularMargen(producto.precio, costo)!;
  return {
    producto: nuevo,
    aviso:
      antes !== undefined && antes !== costo
        ? {
            productoId: producto.id,
            nombre: producto.nombre,
            presentacion: "unidad",
            antes,
            ahora: costo,
            ganancia: m.ganancia,
            porcentaje: m.porcentaje,
          }
        : undefined,
  };
}

// ─── Historial de un producto (kardex) ───────────────────────

export type TipoEventoHistorial =
  "venta" | "fiado" | "compra" | "merma" | "consumo_interno" | "abrir_paquete" | "reposicion";

export const ETIQUETA_EVENTO: Record<TipoEventoHistorial, string> = {
  venta: "Venta",
  fiado: "A cuenta (fiado)",
  compra: "Compra",
  merma: "Merma",
  consumo_interno: "Consumo interno",
  abrir_paquete: "Se abrió",
  reposicion: "Reposición del proveedor",
};

/** Cambio en el stock: cuántas unidades (simple o sueltas) y cuántos paquetes. */
interface Cambio {
  unidades: number;
  paquetes: number;
}

export interface EventoHistorial {
  fecha: string;
  tipo: TipoEventoHistorial;
  /** Ej. "Comprobante 3F2A9C1B", "Importadora Xela · FAC-8941", "Humedad". */
  detalle?: string;
  cambio: Cambio;
  registradoPor: string;
  /** Cómo quedó el stock después de este movimiento. */
  despues: { unidades: number; paquetes: number };
}

/** Lo que se registró en cada parte del sistema, ya filtrado para este producto. */
export interface FuentesHistorial {
  ventas: {
    fecha: string;
    presentacion: Presentacion;
    cantidad: number;
    comprobante: string;
    por: string;
  }[];
  fiados: { fecha: string; cantidad: number; cuenta: string; por: string }[];
  compras: {
    fecha: string;
    presentacion: Presentacion;
    cantidad: number;
    proveedor: string;
    factura?: string;
    por: string;
  }[];
  movimientos: {
    fecha: string;
    tipo: "merma" | "consumo_interno";
    presentacion: Presentacion;
    cantidad: number;
    motivo?: string;
    por: string;
  }[];
  aperturas: { fecha: string; por: string }[];
  reposiciones: {
    fecha: string;
    presentacion: Presentacion;
    cantidad: number;
    proveedor: string;
    por: string;
  }[];
}

/**
 * Historial del producto, del más reciente al más antiguo, con el stock que quedó después de
 * cada movimiento. Se calcula hacia atrás desde el stock actual (que es el dato real).
 */
export function construirHistorial(producto: Producto, f: FuentesHistorial): EventoHistorial[] {
  const u = producto.fraccionable?.unidadesPorPaquete ?? 1;
  const cambio = (p: Presentacion, n: number): Cambio =>
    p === "paquete" ? { unidades: 0, paquetes: n } : { unidades: n, paquetes: 0 };

  const eventos: Omit<EventoHistorial, "despues">[] = [
    ...f.ventas.map((v) => ({
      fecha: v.fecha,
      tipo: "venta" as const,
      detalle: `Comprobante ${v.comprobante}`,
      cambio: cambio(v.presentacion, -v.cantidad),
      registradoPor: v.por,
    })),
    ...f.fiados.map((v) => ({
      fecha: v.fecha,
      tipo: "fiado" as const,
      detalle: `Cuenta de ${v.cuenta}`,
      cambio: cambio("unidad", -v.cantidad),
      registradoPor: v.por,
    })),
    ...f.compras.map((c) => ({
      fecha: c.fecha,
      tipo: "compra" as const,
      detalle: c.factura ? `${c.proveedor} · ${c.factura}` : c.proveedor,
      cambio: cambio(c.presentacion, c.cantidad),
      registradoPor: c.por,
    })),
    ...f.movimientos.map((m) => ({
      fecha: m.fecha,
      tipo: m.tipo,
      detalle: m.motivo,
      cambio: cambio(m.presentacion, -m.cantidad),
      registradoPor: m.por,
    })),
    ...f.aperturas.map((a) => ({
      fecha: a.fecha,
      tipo: "abrir_paquete" as const,
      cambio: { unidades: u, paquetes: -1 },
      registradoPor: a.por,
    })),
    ...f.reposiciones.map((r) => ({
      fecha: r.fecha,
      tipo: "reposicion" as const,
      detalle: r.proveedor,
      cambio: cambio(r.presentacion, r.cantidad),
      registradoPor: r.por,
    })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));

  let unidades =
    producto.stock.tipo === "simple" ? producto.stock.disponible : producto.stock.sueltas;
  let paquetes = producto.stock.tipo === "simple" ? 0 : producto.stock.paquetes;
  return eventos.map((e) => {
    const despues = { unidades, paquetes };
    unidades -= e.cambio.unidades;
    paquetes -= e.cambio.paquetes;
    return { ...e, despues };
  });
}
