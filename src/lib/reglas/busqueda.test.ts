import { describe, expect, it } from "vitest";
import { PRODUCTOS_DEMO } from "@/lib/mocks/productos";
import { buscarPorCodigo, buscarProductos, distancia, normalizar } from "./busqueda";

const nombres = (q: string) => buscarProductos(PRODUCTOS_DEMO, q).map((p) => p.nombre);

describe("buscador de productos (sección 8.2)", () => {
  it("no distingue mayúsculas ni tildes", () => {
    expect(normalizar("  LIBRERÍA ")).toBe("libreria");
    expect(nombres("MOUSE INALAMBRICO")).toEqual(["Mouse inalámbrico"]);
  });

  it("código interno exacto devuelve solo ese producto", () => {
    expect(nombres("lib-0034")).toEqual(["Folder tamaño carta"]);
  });

  it("el lector de código de barras encuentra por EAN", () => {
    expect(buscarPorCodigo(PRODUCTOS_DEMO, "7401234500501")?.nombre).toBe("Cuaderno universitario");
    expect(buscarPorCodigo(PRODUCTOS_DEMO, "0000")).toBeUndefined();
  });

  it("todas las palabras deben coincidir", () => {
    expect(nombres("folder oficio")).toEqual(["Folder tamaño oficio"]);
  });

  it("tolera errores de dedo y los pone después de las coincidencias exactas", () => {
    expect(nombres("cuadreno")).toEqual(["Cuaderno universitario"]);
    expect(nombres("lapisero")).toEqual(["Lapicero azul"]);
  });

  it("palabras cortas no se aproximan (evita resultados basura)", () => {
    expect(nombres("usx")).toEqual([]);
  });

  it("busca por inicio de palabra", () => {
    expect(nombres("fold")).toEqual(["Folder tamaño carta", "Folder tamaño oficio"]);
  });

  it("consulta vacía devuelve todo", () => {
    expect(buscarProductos(PRODUCTOS_DEMO, "  ")).toHaveLength(PRODUCTOS_DEMO.length);
  });

  it("distancia de edición", () => {
    expect(distancia("cuadreno", "cuaderno")).toBe(2);
    expect(distancia("folder", "folder")).toBe(0);
  });
});
