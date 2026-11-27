import { nivelStock, type NivelStock } from "@/lib/stock";
import type { Presentacion, Producto, ProductoVenta, Stock } from "@/types/producto";

export class StockInsuficienteError extends Error {
  constructor(message = "No hay suficiente stock") {
    super(message);
    this.name = "StockInsuficienteError";
  }
}

/** Unidades totales disponibles (en fraccionables: paquetes × unidades + sueltas). */
export function unidadesDisponibles(stock: Stock, unidadesPorPaquete = 1): number {
  return stock.tipo === "simple"
    ? stock.disponible
    : stock.paquetes * unidadesPorPaquete + stock.sueltas;
}

/** Semáforo de un producto completo (sección 11.1). */
export function nivelProducto(producto: Pick<Producto, "stock" | "fraccionable">): NivelStock {
  const { stock } = producto;
  if (stock.tipo === "simple") return nivelStock(stock.disponible, stock.referencia);
  const u = producto.fraccionable?.unidadesPorPaquete ?? 1;
  return nivelStock(unidadesDisponibles(stock, u), stock.referenciaPaquetes * u);
}

/**
 * Descuenta stock por una venta, consumo interno, merma o pendiente.
 * En fraccionables cada presentación descuenta de su propio contador; nunca abre paquetes sola.
 */
export function descontarStock(stock: Stock, presentacion: Presentacion, cantidad: number): Stock {
  if (!Number.isInteger(cantidad) || cantidad <= 0)
    throw new Error("La cantidad debe ser un entero mayor a 0");

  if (stock.tipo === "simple") {
    if (presentacion === "paquete") throw new Error("Este producto no se vende por paquete");
    if (cantidad > stock.disponible) throw new StockInsuficienteError();
    return { ...stock, disponible: stock.disponible - cantidad };
  }

  if (presentacion === "paquete") {
    if (cantidad > stock.paquetes)
      throw new StockInsuficienteError("No hay suficientes paquetes cerrados");
    return { ...stock, paquetes: stock.paquetes - cantidad };
  }
  if (cantidad > stock.sueltas) {
    throw new StockInsuficienteError(
      "No alcanzan las unidades sueltas. Abre un nuevo paquete desde el producto.",
    );
  }
  return { ...stock, sueltas: stock.sueltas - cantidad };
}

/** Suma stock al registrar una compra o reabastecimiento (solo Paola y Oscar). */
export function sumarStock(stock: Stock, presentacion: Presentacion, cantidad: number): Stock {
  if (!Number.isInteger(cantidad) || cantidad <= 0)
    throw new Error("La cantidad debe ser un entero mayor a 0");
  if (stock.tipo === "simple") return { ...stock, disponible: stock.disponible + cantidad };
  return presentacion === "paquete"
    ? { ...stock, paquetes: stock.paquetes + cantidad }
    : { ...stock, sueltas: stock.sueltas + cantidad };
}

/**
 * "Abrir nuevo paquete" (sección 11.5): resta 1 paquete y suma sus unidades a las sueltas.
 * No es venta ni gasto, solo una conversión de formato. Lo puede hacer cualquier rol.
 */
export function abrirPaquete(stock: Stock, unidadesPorPaquete: number): Stock {
  if (stock.tipo !== "fraccionable") throw new Error("Este producto no se vende por paquete");
  if (stock.paquetes <= 0)
    throw new StockInsuficienteError("No quedan paquetes cerrados para abrir");
  return { ...stock, paquetes: stock.paquetes - 1, sueltas: stock.sueltas + unidadesPorPaquete };
}

/**
 * Lo que recibe el Empleado (secciones 8.1 y 11.6). Se arma con una lista de campos PERMITIDOS:
 * si mañana se agrega un dato sensible a Producto, no se filtra al navegador por accidente.
 * Se usa en el servidor, antes de mandar los datos al navegador.
 */
export function aVistaEmpleado(producto: Producto): ProductoVenta {
  const { stock, fraccionable } = producto;
  const u = fraccionable?.unidadesPorPaquete ?? 1;
  return {
    id: producto.id,
    codigo: producto.codigo,
    codigoBarras: producto.codigoBarras,
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    imagenUrl: producto.imagenUrl,
    categoria: producto.categoria,
    subcategoria: producto.subcategoria,
    precio: producto.precio,
    mayoreo: producto.mayoreo,
    aplicaConsumoInterno: producto.aplicaConsumoInterno,
    activo: producto.activo,
    fraccionable: fraccionable && {
      unidadesPorPaquete: fraccionable.unidadesPorPaquete,
      precioPaquete: fraccionable.precioPaquete,
    },
    disponibilidad: {
      nivel: nivelProducto(producto),
      agotado: unidadesDisponibles(stock, u) <= 0,
      ...(stock.tipo === "fraccionable" && {
        sinSueltas: stock.sueltas <= 0,
        sinPaquetes: stock.paquetes <= 0,
      }),
    },
  };
}
