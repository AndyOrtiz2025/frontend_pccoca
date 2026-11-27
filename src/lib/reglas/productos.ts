import type { ProductoInput } from "@/schemas/producto.schema";
import type { Categoria, Producto, Stock } from "@/types/producto";
import { PREFIJO_CODIGO } from "@/types/producto";
import { cantidadCon } from "@/lib/presentacion";
import { centavos } from "./dinero";
import { nivelProducto } from "./inventario";

/** Siguiente código libre de la categoría: si el último es LIB-0070, sugiere LIB-0071. */
export function siguienteCodigo(
  productos: Pick<Producto, "codigo">[],
  categoria: Categoria,
): string {
  const prefijo = PREFIJO_CODIGO[categoria];
  const mayor = productos.reduce((max, p) => {
    const m = new RegExp(`^${prefijo}-(\\d{4})$`).exec(p.codigo);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);
  return `${prefijo}-${String(mayor + 1).padStart(4, "0")}`;
}

/** Stock inicial según el tipo de producto. */
function stockInicial(datos: ProductoInput): Stock {
  if (datos.fraccionable) {
    return {
      tipo: "fraccionable",
      paquetes: datos.stockInicial,
      sueltas: Math.min(datos.sueltasIniciales ?? 0, datos.fraccionable.unidadesPorPaquete - 1),
      referenciaPaquetes: Math.max(datos.stockReferencia ?? 0, datos.stockInicial, 1),
    };
  }
  return {
    tipo: "simple",
    disponible: datos.stockInicial,
    referencia: Math.max(datos.stockReferencia ?? 0, datos.stockInicial, 1),
  };
}

/** Datos del paquete tal como se guardan (dinero redondeado a centavos). */
function datosPaquete(f: NonNullable<ProductoInput["fraccionable"]>) {
  return {
    unidadesPorPaquete: f.unidadesPorPaquete,
    nombrePaquete: f.nombrePaquete || undefined,
    precioPaquete: centavos(f.precioPaquete),
    mayoreoPaquete: f.mayoreoPaquete
      ? { desde: f.mayoreoPaquete.desde, precio: centavos(f.mayoreoPaquete.precio) }
      : undefined,
    costoPaquete: f.costoPaquete === undefined ? undefined : centavos(f.costoPaquete),
  };
}

/**
 * Costo por unidad. En productos por paquete se calcula del costo del paquete
 * (caja de 12 a Q 18 → Q 1.50 por lápiz) para no pedir dos costos que no cuadren.
 */
function costoUnitario(datos: ProductoInput): number | undefined {
  const f = datos.fraccionable;
  if (f?.costoPaquete !== undefined) return centavos(f.costoPaquete / f.unidadesPorPaquete);
  return datos.costo === undefined ? undefined : centavos(datos.costo);
}

/** Los campos que se editan igual al crear y al editar (sin stock ni tipo). */
function camposEditables(datos: ProductoInput) {
  return {
    codigo: datos.codigo,
    codigoBarras: datos.codigoBarras || datos.codigo,
    nombre: datos.nombre,
    descripcion: datos.descripcion || undefined,
    subcategoria: datos.subcategoria || undefined,
    precio: centavos(datos.precio),
    mayoreo: datos.mayoreo
      ? { desde: datos.mayoreo.desde, precio: centavos(datos.mayoreo.precio) }
      : undefined,
    costo: costoUnitario(datos),
    aplicaConsumoInterno: datos.aplicaConsumoInterno,
    proveedorId: datos.proveedorId || undefined,
  };
}

/** Producto nuevo a partir del formulario ya validado. */
export function crearDesdeFormulario(id: string, datos: ProductoInput): Producto {
  return {
    id,
    categoria: datos.categoria,
    ...camposEditables(datos),
    fraccionable: datos.fraccionable && datosPaquete(datos.fraccionable),
    stock: stockInicial(datos),
    activo: true,
  };
}

/**
 * Editar: cambian datos y precios, pero NO el stock (se mueve con compras y mermas).
 * Las unidades por paquete solo se corrigen si no hay unidades sueltas (todo en paquetes
 * cerrados): así no se descuadra nada si se equivocaron al crearlo.
 * Se lanza un error con mensaje para Paola si intenta algo que no se puede.
 */
export function aplicarEdicion(producto: Producto, datos: ProductoInput): Producto {
  if (!!datos.fraccionable !== !!producto.fraccionable) {
    throw new Error("No se puede cambiar si es fraccionable después de crearlo");
  }
  if (
    producto.fraccionable &&
    datos.fraccionable &&
    datos.fraccionable.unidadesPorPaquete !== producto.fraccionable.unidadesPorPaquete &&
    producto.stock.tipo === "fraccionable" &&
    producto.stock.sueltas > 0
  ) {
    throw new Error(
      "Hay unidades sueltas: las unidades por paquete solo se corrigen con todo en paquetes cerrados",
    );
  }
  const stock: Stock =
    datos.stockReferencia === undefined
      ? producto.stock
      : producto.stock.tipo === "simple"
        ? { ...producto.stock, referencia: Math.max(datos.stockReferencia, 1) }
        : { ...producto.stock, referenciaPaquetes: Math.max(datos.stockReferencia, 1) };
  return {
    ...producto,
    ...camposEditables(datos),
    fraccionable: datos.fraccionable && datosPaquete(datos.fraccionable),
    stock,
  };
}

/** Valor del stock de un producto: a costo (lo invertido) y a precio de venta. */
export function valorStock(p: Producto): { costo: number; venta: number } {
  if (p.stock.tipo === "simple") {
    return {
      costo: centavos(p.stock.disponible * (p.costo ?? 0)),
      venta: centavos(p.stock.disponible * p.precio),
    };
  }
  const f = p.fraccionable;
  const costoPaquete = f?.costoPaquete ?? (p.costo ?? 0) * (f?.unidadesPorPaquete ?? 1);
  return {
    costo: centavos(p.stock.paquetes * costoPaquete + p.stock.sueltas * (p.costo ?? 0)),
    venta: centavos(p.stock.paquetes * (f?.precioPaquete ?? 0) + p.stock.sueltas * p.precio),
  };
}

export interface ResumenInventario {
  productos: number;
  valorCosto: number;
  valorVenta: number;
  /** Productos activos en rojo o naranja. */
  bajoStock: number;
  /** Margen promedio de los productos con costo (en %). */
  margenPromedio: number | null;
}

/** Totales de la pantalla de inventario (solo productos activos). */
export function resumenInventario(productos: Producto[]): ResumenInventario {
  const activos = productos.filter((p) => p.activo);
  const valores = activos.map(valorStock);
  const conCosto = activos.filter((p) => p.costo !== undefined && p.precio > 0);
  return {
    productos: activos.length,
    valorCosto: centavos(valores.reduce((t, v) => t + v.costo, 0)),
    valorVenta: centavos(valores.reduce((t, v) => t + v.venta, 0)),
    bajoStock: activos.filter((p) => nivelProducto(p) !== "ok").length,
    margenPromedio: conCosto.length
      ? Math.round(
          conCosto.reduce((t, p) => t + ((p.precio - p.costo!) / p.precio) * 100, 0) /
            conCosto.length,
        )
      : null,
  };
}

/** "9 sueltas · 19 cajas" o "18 unidades". */
export function describirStock(p: Producto): string {
  if (p.stock.tipo === "simple") {
    return `${p.stock.disponible} ${p.stock.disponible === 1 ? "unidad" : "unidades"}`;
  }
  const { paquetes, sueltas } = p.stock;
  return `${sueltas} ${sueltas === 1 ? "suelta" : "sueltas"} · ${cantidadCon(p, "paquete", paquetes)}`;
}

/** Inventario como CSV (separado por comas, con BOM para que Excel respete las tildes). */
export function inventarioCsv(productos: Producto[]): string {
  const celda = (v: string | number | undefined) => {
    const t = v === undefined ? "" : String(v);
    // Evita que Excel ejecute fórmulas si un nombre empieza con = + - @
    const seguro = /^[=+\-@]/.test(t) ? `'${t}` : t;
    return /[",\n;]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
  };
  const filas = [
    [
      "Código",
      "Código de barras",
      "Nombre",
      "Subcategoría",
      "Precio",
      "Mayoreo desde",
      "Precio mayoreo",
      "Costo",
      "Paquete",
      "Unidades por paquete",
      "Precio paquete",
      "Mayoreo paquete desde",
      "Precio mayoreo paquete",
      "Paquetes",
      "Sueltas / Unidades",
      "Valor a costo",
      "Valor a venta",
      "Activo",
    ],
    ...productos.map((p) => {
      const v = valorStock(p);
      return [
        p.codigo,
        p.codigoBarras,
        p.nombre,
        p.subcategoria,
        p.precio.toFixed(2),
        p.mayoreo?.desde,
        p.mayoreo?.precio.toFixed(2),
        p.costo?.toFixed(2),
        p.fraccionable && (p.fraccionable.nombrePaquete || "Paquete"),
        p.fraccionable?.unidadesPorPaquete,
        p.fraccionable?.precioPaquete.toFixed(2),
        p.fraccionable?.mayoreoPaquete?.desde,
        p.fraccionable?.mayoreoPaquete?.precio.toFixed(2),
        p.stock.tipo === "fraccionable" ? p.stock.paquetes : undefined,
        p.stock.tipo === "fraccionable" ? p.stock.sueltas : p.stock.disponible,
        v.costo.toFixed(2),
        v.venta.toFixed(2),
        p.activo ? "Sí" : "No",
      ];
    }),
  ];
  return "﻿" + filas.map((f) => f.map(celda).join(",")).join("\r\n");
}
