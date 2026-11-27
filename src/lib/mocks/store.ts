import "server-only";
import type { ArchivoAdjunto, Entrada } from "@/types/entrada";
import type { Producto } from "@/types/producto";
import type { Comprobante, TipoMovimiento } from "@/types/movimiento";
import { ENTRADAS_DEMO } from "./procesos";
import { PRODUCTOS_DEMO } from "./productos";

/** Movimiento que no es venta: consumo interno o merma (secciones 11.4 y 11.7). */
export interface MovimientoRegistrado {
  id: string;
  tipo: Exclude<TipoMovimiento, "venta">;
  productoId: string;
  presentacion: "unidad" | "paquete";
  cantidad: number;
  motivo?: string;
  fecha: string;
  registradoPor: string;
}

/** Registro de "Abrir nuevo paquete" (sección 11.5: trazabilidad de conversión de stock). */
export interface ConversionRegistrada {
  productoId: string;
  fecha: string;
  registradoPor: string;
}

interface Almacen {
  productos: Producto[];
  comprobantes: Comprobante[];
  movimientos: MovimientoRegistrado[];
  conversiones: ConversionRegistrada[];
  entradas: Entrada[];
  /** Contenido de los archivos subidos, por id. */
  archivos: Map<string, { meta: ArchivoAdjunto; datos: Uint8Array }>;
}

/**
 * Almacén EN MEMORIA mientras no hay backend: las ventas se pierden al reiniciar `npm run dev`.
 * Se guarda en globalThis para que la recarga en caliente de Next.js no lo reinicie a cada cambio.
 * TODO(backend): se elimina; las mutaciones van a POST /api/... del backend.
 */
const g = globalThis as unknown as { __pccocaAlmacen?: Almacen };

export function almacen(): Almacen {
  g.__pccocaAlmacen ??= {
    productos: structuredClone(PRODUCTOS_DEMO),
    comprobantes: [],
    movimientos: [],
    conversiones: [],
    entradas: structuredClone(ENTRADAS_DEMO),
    archivos: new Map(),
  };
  return g.__pccocaAlmacen;
}

/** Solo para pruebas: vuelve a los datos iniciales. */
export function reiniciarAlmacen() {
  g.__pccocaAlmacen = undefined;
}
