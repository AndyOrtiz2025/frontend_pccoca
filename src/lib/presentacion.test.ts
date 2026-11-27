import { describe, expect, it } from "vitest";
import { calcularPrecio } from "./reglas/precios";
import { cantidadCon, etiquetaPresentacion, nombrePaquete, pluralPaquete } from "./presentacion";

const mongol = {
  categoria: "libreria" as const,
  precio: 2,
  fraccionable: {
    unidadesPorPaquete: 12,
    nombrePaquete: "Caja",
    precioPaquete: 22,
    mayoreoPaquete: { desde: 5, precio: 20 },
  },
};
const fomi = {
  categoria: "libreria" as const,
  precio: 15,
  mayoreo: { desde: 4, precio: 12 },
  fraccionable: { unidadesPorPaquete: 15, nombrePaquete: "Bolsa", precioPaquete: 170 },
};

describe("precios por caja y por unidad", () => {
  it("caja normal y caja por mayoreo desde 5", () => {
    expect(calcularPrecio(mongol, "paquete", 2)).toEqual({
      unitario: 22,
      normal: 22,
      mayoreo: false,
    });
    expect(calcularPrecio(mongol, "paquete", 5)).toEqual({
      unitario: 20,
      normal: 22,
      mayoreo: true,
    });
    expect(calcularPrecio(mongol, "unidad", 30).unitario).toBe(2); // sin mayoreo por lápiz
  });

  it("fomi: pliego a Q 15, desde 4 pliegos a Q 12; la bolsa sin mayoreo", () => {
    expect(calcularPrecio(fomi, "unidad", 3).unitario).toBe(15);
    expect(calcularPrecio(fomi, "unidad", 4)).toMatchObject({ unitario: 12, mayoreo: true });
    expect(calcularPrecio(fomi, "paquete", 10).unitario).toBe(170);
  });

  it("Tecnología nunca tiene mayoreo", () => {
    expect(calcularPrecio({ ...mongol, categoria: "tecnologia" }, "paquete", 9).mayoreo).toBe(
      false,
    );
  });
});

describe("nombre del paquete", () => {
  it("usa el nombre del producto o 'Paquete'", () => {
    expect(nombrePaquete(mongol)).toBe("Caja");
    expect(nombrePaquete({ fraccionable: {} })).toBe("Paquete");
    expect(etiquetaPresentacion(fomi, "paquete")).toBe("Por bolsa");
    expect(etiquetaPresentacion(fomi, "unidad")).toBe("Por unidad");
  });

  it("plural de los conocidos y de los escritos en 'Otro'", () => {
    expect(pluralPaquete("Blíster")).toBe("Blísteres");
    expect(pluralPaquete("Cubeta")).toBe("Cubetas");
    expect(pluralPaquete("Cartón")).toBe("Cartones");
    expect(pluralPaquete("Paquete")).toBe("Paquetes");
    expect(pluralPaquete("Lápiz")).toBe("Lápices");
    expect(cantidadCon(mongol, "paquete", 3)).toBe("3 cajas");
    expect(cantidadCon(mongol, "paquete", 1)).toBe("1 caja");
    expect(cantidadCon(mongol, "unidad", 1)).toBe("1 unidad");
  });
});
