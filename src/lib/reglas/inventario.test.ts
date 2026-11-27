import { describe, expect, it } from "vitest";
import { PRODUCTOS_DEMO } from "@/lib/mocks/productos";
import type { Stock } from "@/types/producto";
import {
  abrirPaquete,
  aVistaEmpleado,
  descontarStock,
  nivelProducto,
  StockInsuficienteError,
  sumarStock,
} from "./inventario";

const simple: Stock = { tipo: "simple", disponible: 10, referencia: 20 };
const fracc: Stock = { tipo: "fraccionable", paquetes: 3, sueltas: 8, referenciaPaquetes: 10 };

describe("descontarStock", () => {
  it("descuenta del contador simple", () => {
    expect(descontarStock(simple, "unidad", 4)).toMatchObject({ disponible: 6 });
  });

  it("no deja el stock en negativo", () => {
    expect(() => descontarStock(simple, "unidad", 11)).toThrow(StockInsuficienteError);
  });

  it("cada presentación descuenta de su propio contador (sección 11.5)", () => {
    expect(descontarStock(fracc, "unidad", 5)).toMatchObject({ paquetes: 3, sueltas: 3 });
    expect(descontarStock(fracc, "paquete", 2)).toMatchObject({ paquetes: 1, sueltas: 8 });
  });

  it("no abre paquetes sola si faltan sueltas", () => {
    expect(() => descontarStock(fracc, "unidad", 9)).toThrow(/Abre un nuevo paquete/);
  });

  it("rechaza cantidades no enteras o cero", () => {
    expect(() => descontarStock(simple, "unidad", 0)).toThrow();
    expect(() => descontarStock(simple, "unidad", 1.5)).toThrow();
  });

  it("no modifica el stock original", () => {
    descontarStock(simple, "unidad", 1);
    expect(simple.disponible).toBe(10);
  });
});

describe("abrirPaquete", () => {
  it("resta 1 paquete y llena las sueltas con las unidades del paquete", () => {
    expect(abrirPaquete(fracc, 100)).toEqual({ ...fracc, paquetes: 2, sueltas: 108 });
  });

  it("no abre si no quedan paquetes", () => {
    expect(() => abrirPaquete({ ...fracc, paquetes: 0 }, 100)).toThrow(StockInsuficienteError);
  });

  it("solo aplica a fraccionables", () => {
    expect(() => abrirPaquete(simple, 100)).toThrow();
  });
});

describe("sumarStock (reabastecimiento)", () => {
  it("suma al contador correcto", () => {
    expect(sumarStock(fracc, "paquete", 5)).toMatchObject({ paquetes: 8 });
    expect(sumarStock(simple, "unidad", 5)).toMatchObject({ disponible: 15 });
  });
});

describe("nivelProducto", () => {
  it("fraccionable cuenta paquetes × unidades + sueltas", () => {
    // 3×100 + 8 = 308 de 1000 → naranja
    expect(
      nivelProducto({
        stock: fracc,
        fraccionable: { unidadesPorPaquete: 100, precioPaquete: 150 },
      }),
    ).toBe("bajo");
  });
});

describe("aVistaEmpleado", () => {
  const folder = PRODUCTOS_DEMO.find((p) => p.codigo === "LIB-0034")!;
  const vista = aVistaEmpleado(folder);
  const json = JSON.stringify(vista);

  it("no envía costo, stock exacto ni proveedor al Empleado (sección 11.6)", () => {
    expect(vista).not.toHaveProperty("costo");
    expect(vista).not.toHaveProperty("stock");
    expect(vista).not.toHaveProperty("proveedorId");
    expect(vista.fraccionable).not.toHaveProperty("costoPaquete");
    expect(json).not.toMatch(/costo/i);
  });

  it("sí envía el semáforo y los avisos para abrir paquete", () => {
    expect(vista.disponibilidad).toEqual({
      nivel: "bajo",
      agotado: false,
      sinSueltas: false,
      sinPaquetes: false,
    });
  });

  it("ningún producto de prueba filtra el costo", () => {
    for (const p of PRODUCTOS_DEMO) expect(JSON.stringify(aVistaEmpleado(p))).not.toMatch(/costo/i);
  });
});
