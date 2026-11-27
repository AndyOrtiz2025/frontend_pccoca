import { nombrePaquete } from "@/lib/presentacion";
import type { Producto } from "@/types/producto";

/** Hoja carta de 30 etiquetas (3 columnas × 10 filas, 66.7 × 25.4 mm, tipo Avery 5160). */
export const ETIQUETAS_POR_HOJA = 30;

export interface Etiqueta {
  nombre: string;
  /** Ej. "Caja de 12"; vacío en etiquetas por unidad. */
  detalle?: string;
  precio: number;
  codigo: string;
}

export interface PedidoEtiquetas {
  producto: Producto;
  unidades: number;
  cajas: number;
}

/** ¿El producto trae código del fabricante? (distinto a su código interno). */
export function tieneCodigoFabricante(p: Pick<Producto, "codigo" | "codigoBarras">): boolean {
  return p.codigoBarras.toUpperCase() !== p.codigo.toUpperCase();
}

/** Lista de etiquetas a imprimir, en orden, a partir de lo pedido por producto. */
export function armarEtiquetas(pedidos: PedidoEtiquetas[]): Etiqueta[] {
  const lista: Etiqueta[] = [];
  for (const { producto: p, unidades, cajas } of pedidos) {
    for (let i = 0; i < unidades; i++) {
      lista.push({ nombre: p.nombre, precio: p.precio, codigo: p.codigoBarras });
    }
    const f = p.fraccionable;
    if (f?.codigoBarrasPaquete) {
      for (let i = 0; i < cajas; i++) {
        lista.push({
          nombre: p.nombre,
          detalle: `${nombrePaquete(p)} de ${f.unidadesPorPaquete}`,
          precio: f.precioPaquete,
          codigo: f.codigoBarrasPaquete,
        });
      }
    }
  }
  return lista;
}

/**
 * Reparte las etiquetas en hojas de 30. `inicio` (1 a 30) deja en blanco las primeras
 * posiciones de la primera hoja, para aprovechar una hoja ya usada.
 */
export function repartirEnHojas(etiquetas: Etiqueta[], inicio = 1): (Etiqueta | null)[][] {
  const desde = Math.min(Math.max(Math.trunc(inicio), 1), ETIQUETAS_POR_HOJA);
  const celdas: (Etiqueta | null)[] = [...Array(desde - 1).fill(null), ...etiquetas];
  const hojas: (Etiqueta | null)[][] = [];
  for (let i = 0; i < celdas.length; i += ETIQUETAS_POR_HOJA) {
    const hoja = celdas.slice(i, i + ETIQUETAS_POR_HOJA);
    hojas.push([...hoja, ...Array(ETIQUETAS_POR_HOJA - hoja.length).fill(null)]);
  }
  return hojas;
}
