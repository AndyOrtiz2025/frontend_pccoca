import { describe, expect, it } from "vitest";
import { PRODUCTOS_DEMO } from "@/lib/mocks/productos";
import { productoSchema } from "@/schemas/producto.schema";
import type { Producto } from "@/types/producto";
import {
  aplicarEdicion,
  crearDesdeFormulario,
  describirStock,
  inventarioCsv,
  resumenInventario,
  siguienteCodigo,
  valorStock,
} from "./productos";

const folder = PRODUCTOS_DEMO.find((p) => p.codigo === "LIB-0034")!; // fraccionable 100 u.
const resma = PRODUCTOS_DEMO.find((p) => p.codigo === "LIB-0021")!; // simple 18 u.

const base = {
  nombre: "Goma de borrar",
  codigo: "lib-0100",
  categoria: "libreria" as const,
  precio: 1.5,
  costo: 0.75,
  aplicaConsumoInterno: false,
  stockInicial: 30,
};

describe("siguienteCodigo", () => {
  it("sugiere el siguiente número de la categoría", () => {
    expect(siguienteCodigo([{ codigo: "LIB-0070" }, { codigo: "LIB-0009" }], "libreria")).toBe(
      "LIB-0071",
    );
    expect(siguienteCodigo([{ codigo: "LIB-0070" }], "varios")).toBe("VAR-0001");
  });
});

describe("crear y editar", () => {
  it("crea un producto simple; el código de barras por defecto es el código", () => {
    const p = crearDesdeFormulario("x", productoSchema.parse(base));
    expect(p).toMatchObject({ codigo: "LIB-0100", codigoBarras: "LIB-0100", activo: true });
    expect(p.stock).toEqual({ tipo: "simple", disponible: 30, referencia: 30 });
  });

  it("crea un fraccionable con paquetes y sueltas", () => {
    const p = crearDesdeFormulario(
      "x",
      productoSchema.parse({
        ...base,
        fraccionable: { unidadesPorPaquete: 12, precioPaquete: 15 },
        stockInicial: 4,
        sueltasIniciales: 5,
        stockReferencia: 10,
      }),
    );
    expect(p.stock).toEqual({
      tipo: "fraccionable",
      paquetes: 4,
      sueltas: 5,
      referenciaPaquetes: 10,
    });
  });

  it("editar cambia precios pero no el stock", () => {
    const datos = productoSchema.parse({
      ...base,
      codigo: resma.codigo,
      nombre: "Resma carta",
      precio: 45,
      stockInicial: 999,
    });
    const editado = aplicarEdicion(resma, datos);
    expect(editado.precio).toBe(45);
    expect(editado.nombre).toBe("Resma carta");
    expect(editado.stock).toEqual(resma.stock);
  });

  it("no deja cambiar el tipo ni las unidades por paquete", () => {
    const simple = productoSchema.parse({ ...base, codigo: "LIB-0034" });
    expect(() => aplicarEdicion(folder, simple)).toThrow(/fraccionable/);
    const otrasUnidades = productoSchema.parse({
      ...base,
      codigo: "LIB-0034",
      fraccionable: { unidadesPorPaquete: 50, precioPaquete: 80 },
    });
    expect(() => aplicarEdicion(folder, otrasUnidades)).toThrow(/unidades por paquete/);
  });
});

describe("productos por caja (ejemplo del lápiz Mongol)", () => {
  const mongol = {
    ...base,
    nombre: "Lápiz Mongol",
    precio: 2,
    costo: 99, // se ignora: el costo por lápiz sale de la caja
    fraccionable: {
      unidadesPorPaquete: 12,
      nombrePaquete: "Caja",
      precioPaquete: 22,
      mayoreoPaquete: { desde: 5, precio: 20 },
      costoPaquete: 18,
    },
    stockInicial: 20,
  };

  it("el costo por lápiz se calcula de la caja: 18 ÷ 12 = 1.50", () => {
    const p = crearDesdeFormulario("x", productoSchema.parse(mongol));
    expect(p.costo).toBe(1.5);
    expect(p.fraccionable).toMatchObject({
      nombrePaquete: "Caja",
      mayoreoPaquete: { desde: 5, precio: 20 },
    });
    expect(p.stock).toMatchObject({ paquetes: 20, sueltas: 0 });
  });

  it("el mayoreo por caja debe ser menor al precio de la caja", () => {
    const r = productoSchema.safeParse({
      ...mongol,
      fraccionable: { ...mongol.fraccionable, mayoreoPaquete: { desde: 5, precio: 22 } },
    });
    expect(r.success).toBe(false);
  });

  it("las unidades por caja se corrigen si todo está en cajas cerradas", () => {
    const creado = crearDesdeFormulario(
      "x",
      productoSchema.parse({
        ...mongol,
        fraccionable: { ...mongol.fraccionable, unidadesPorPaquete: 2 },
      }),
    );
    const corregido = aplicarEdicion(creado, productoSchema.parse(mongol));
    expect(corregido.fraccionable?.unidadesPorPaquete).toBe(12);
    expect(corregido.costo).toBe(1.5);
  });
});

describe("inventario", () => {
  it("valor a costo y a venta (fraccionable: paquetes + sueltas)", () => {
    // 3 paquetes × Q 110 + 8 sueltas × Q 1.10 ; venta 3 × Q 150 + 8 × Q 2
    expect(valorStock(folder)).toEqual({ costo: 338.8, venta: 466 });
    expect(valorStock(resma)).toEqual({ costo: 594, venta: 756 });
    expect(describirStock(folder)).toBe("8 sueltas · 3 paquetes");
    expect(describirStock(resma)).toBe("18 unidades");
  });

  it("el resumen no cuenta inactivos", () => {
    const inactivo: Producto = { ...resma, id: "y", activo: false };
    expect(resumenInventario([resma, inactivo]).productos).toBe(1);
    expect(resumenInventario([resma]).margenPromedio).toBe(21);
  });

  it("CSV con BOM y sin fórmulas peligrosas", () => {
    const csv = inventarioCsv([{ ...resma, nombre: '=HYPERLINK("x")' }]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });
});
