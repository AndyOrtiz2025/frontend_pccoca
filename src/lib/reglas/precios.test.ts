import { describe, expect, it } from "vitest";
import { PRODUCTOS_DEMO } from "@/lib/mocks/productos";
import { calcularMargen, calcularPrecio } from "./precios";

const folder = PRODUCTOS_DEMO.find((p) => p.codigo === "LIB-0034")!; // Q 2.00, mayoreo desde 10 a Q 1.50, paquete Q 150
const usb = {
  ...PRODUCTOS_DEMO.find((p) => p.codigo === "TEC-0012")!,
  mayoreo: { desde: 2, precio: 1 },
};

describe("calcularPrecio", () => {
  it("precio normal por debajo del umbral", () => {
    expect(calcularPrecio(folder, "unidad", 9)).toEqual({ unitario: 2, normal: 2, mayoreo: false });
  });

  it("mayoreo a partir del umbral (ej. de Q 2.00 a Q 1.50)", () => {
    expect(calcularPrecio(folder, "unidad", 10)).toEqual({
      unitario: 1.5,
      normal: 2,
      mayoreo: true,
    });
    expect(calcularPrecio(folder, "unidad", 12).unitario).toBe(1.5);
  });

  it("por paquete usa su propio precio y nunca mayoreo", () => {
    expect(calcularPrecio(folder, "paquete", 20)).toEqual({
      unitario: 150,
      normal: 150,
      mayoreo: false,
    });
  });

  it("Tecnología ignora el mayoreo aunque tenga uno configurado", () => {
    expect(calcularPrecio(usb, "unidad", 50).mayoreo).toBe(false);
  });

  it("no vende por paquete un producto que no es fraccionable", () => {
    expect(() => calcularPrecio(usb, "paquete", 1)).toThrow();
  });
});

describe("calcularMargen", () => {
  it("ganancia y porcentaje sobre el precio", () => {
    expect(calcularMargen(2, 1.1)).toEqual({ ganancia: 0.9, porcentaje: 45 });
  });

  it("sin costo no hay margen", () => {
    expect(calcularMargen(2, undefined)).toBeNull();
  });
});
