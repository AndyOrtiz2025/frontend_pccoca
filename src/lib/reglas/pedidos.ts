import { nivelProducto } from "@/lib/reglas/inventario";
import type { NivelStock } from "@/lib/stock";
import type { EstadoPedido, LineaPedido, Pedido } from "@/types/pedido";
import type { Categoria, Presentacion, Producto } from "@/types/producto";

/** Cuánto falta por llegar de una línea (0 si ya no se espera). */
export function faltan(l: LineaPedido): number {
  return l.estado === "pendiente" ? Math.max(0, l.cantidad - l.recibidas) : 0;
}

/**
 * Estado del pedido, calculado de sus líneas:
 * - Por llegar: nada ha llegado y hay algo pendiente.
 * - Llegó una parte: algo llegó y todavía se espera algo más.
 * - Recibido: ya no se espera nada y algo llegó.
 * - Cancelado: ya no se espera nada y no llegó nada.
 */
export function estadoPedido(p: Pick<Pedido, "lineas">): EstadoPedido {
  const algoLlego = p.lineas.some((l) => l.recibidas > 0);
  const seEspera = p.lineas.some((l) => l.estado === "pendiente");
  if (seEspera) return algoLlego ? "parcial" : "pendiente";
  return algoLlego ? "recibido" : "cancelado";
}

export const pedidoAbierto = (p: Pick<Pedido, "lineas">) => {
  const e = estadoPedido(p);
  return e === "pendiente" || e === "parcial";
};

/** "P-0007": siguiente número de pedido. */
export function siguienteNumeroPedido(pedidos: Pick<Pedido, "numero">[]): string {
  const max = pedidos.reduce((m, p) => Math.max(m, Number(p.numero.slice(2)) || 0), 0);
  return `P-${String(max + 1).padStart(4, "0")}`;
}

export interface SugerenciaPedido {
  productoId: string;
  presentacion: Presentacion;
  /** Lo que hace falta para volver al total registrado (mínimo 1). */
  cantidad: number;
  nivel: Exclude<NivelStock, "ok">;
  agotado: boolean;
}

/**
 * Productos que se están acabando y que surte este proveedor (o que no tienen proveedor):
 * primero los agotados y críticos. Los fraccionables se piden por caja.
 */
export function sugerirPedido(
  productos: Producto[],
  proveedor: { id: string; surte: Categoria[] },
  categorias: Categoria[],
): SugerenciaPedido[] {
  const orden = { critico: 0, bajo: 1 } as const;
  return productos
    .filter(
      (p) =>
        p.activo &&
        categorias.includes(p.categoria) &&
        proveedor.surte.includes(p.categoria) &&
        (p.proveedorId === undefined || p.proveedorId === proveedor.id),
    )
    .flatMap((p): SugerenciaPedido[] => {
      const nivel = nivelProducto(p);
      if (nivel === "ok") return [];
      const s = p.stock;
      if (s.tipo === "fraccionable") {
        return [
          {
            productoId: p.id,
            presentacion: "paquete",
            cantidad: Math.max(1, s.referenciaPaquetes - s.paquetes),
            nivel,
            agotado: s.paquetes === 0 && s.sueltas === 0,
          },
        ];
      }
      return [
        {
          productoId: p.id,
          presentacion: "unidad",
          cantidad: Math.max(1, s.referencia - s.disponible),
          nivel,
          agotado: s.disponible === 0,
        },
      ];
    })
    .sort((a, b) => Number(b.agotado) - Number(a.agotado) || orden[a.nivel] - orden[b.nivel]);
}

/**
 * Cambiar el precio después de ver que el costo cambió (aviso de la compra).
 * El mayoreo tiene que seguir siendo más barato que el precio normal.
 */
export function cambiarPrecio(
  producto: Producto,
  presentacion: Presentacion,
  precio: number,
): Producto {
  if (presentacion === "paquete") {
    const f = producto.fraccionable;
    if (!f) throw new Error(`${producto.nombre} no se vende por caja`);
    if (f.mayoreoPaquete && f.mayoreoPaquete.precio >= precio) {
      throw new Error(
        `El mayoreo (Q ${f.mayoreoPaquete.precio.toFixed(2)}) debe quedar más barato que el precio. Cámbialo desde Editar producto.`,
      );
    }
    return { ...producto, fraccionable: { ...f, precioPaquete: precio } };
  }
  if (producto.mayoreo && producto.mayoreo.precio >= precio) {
    throw new Error(
      `El mayoreo (Q ${producto.mayoreo.precio.toFixed(2)}) debe quedar más barato que el precio. Cámbialo desde Editar producto.`,
    );
  }
  return { ...producto, precio };
}
