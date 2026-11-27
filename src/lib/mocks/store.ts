import "server-only";
import type { ArchivoAdjunto, Entrada } from "@/types/entrada";
import type { Cargo, CuentaPendiente, PagoCuenta } from "@/types/pendiente";
import type { EnProceso } from "@/types/proceso";
import type { Categoria, Producto } from "@/types/producto";
import type { Comprobante, TipoMovimiento } from "@/types/movimiento";
import { CARGOS_DEMO, CUENTAS_DEMO, PAGOS_DEMO } from "./pendientes";
import { ENTRADAS_DEMO, PROCESOS_DEMO } from "./procesos";
import { PRODUCTOS_DEMO } from "./productos";
import { ventasDemo } from "./ventas";

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
  procesos: EnProceso[];
  cuentas: CuentaPendiente[];
  cargos: Cargo[];
  pagos: PagoCuenta[];
  /** Contenido de los archivos subidos, por id. */
  archivos: Map<string, { meta: ArchivoAdjunto; datos: Uint8Array }>;
  /**
   * Fotos de productos. Separadas de `archivos` a propósito: las ve cualquier usuario con sesión,
   * mientras que los archivos de trámites (DPI, recibos) solo los ve Paola.
   */
  imagenes: Map<string, { tipo: "image/jpeg" | "image/png" | "image/webp"; datos: Uint8Array }>;
  /** Subcategorías creadas a mano (pueden no tener productos todavía), por categoría. */
  subcategorias: Record<Categoria, string[]>;
  /** Última vez que Paola u Oscar vaciaron su historial (entregados y descartados). */
  historialVaciado: Partial<Record<"paola" | "oscar", string>>;
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
    comprobantes: ventasDemo(),
    movimientos: [],
    conversiones: [],
    entradas: structuredClone(ENTRADAS_DEMO),
    procesos: structuredClone(PROCESOS_DEMO),
    cuentas: structuredClone(CUENTAS_DEMO),
    cargos: structuredClone(CARGOS_DEMO),
    pagos: structuredClone(PAGOS_DEMO),
    archivos: archivosDemo(),
    historialVaciado: {},
    imagenes: new Map(),
    subcategorias: { libreria: [], tecnologia: [], varios: [] },
  };
  return g.__pccocaAlmacen;
}

/** Solo para pruebas: vuelve a los datos iniciales. */
export function reiniciarAlmacen() {
  g.__pccocaAlmacen = undefined;
}

/** PDF mínimo de prueba para el DPI escaneado de la entrada en-1 (bandeja de Paola). */
function archivosDemo(): Almacen["archivos"] {
  const texto = [
    "%PDF-1.4",
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 180]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj",
    "4 0 obj<</Length 58>>stream",
    "BT /F1 16 Tf 40 90 Td (DPI de prueba - Ana Ramirez) Tj ET",
    "endstream endobj",
    "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj",
    "trailer<</Root 1 0 R>>",
    "%%EOF",
  ].join("\n");
  const datos = new TextEncoder().encode(texto);
  return new Map([
    [
      "AR-demo-dpi",
      {
        meta: {
          id: "AR-demo-dpi",
          nombre: "DPI-Ana-Ramirez.pdf",
          tipo: "application/pdf",
          tamano: datos.byteLength,
        },
        datos,
      },
    ],
  ]);
}
