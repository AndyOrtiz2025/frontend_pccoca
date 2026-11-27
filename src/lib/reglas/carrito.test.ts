import { describe, expect, it } from "vitest";
import { PRODUCTOS_DEMO } from "@/lib/mocks/productos";
import type { LineaCarrito } from "@/types/movimiento";
import { aVistaEmpleado } from "./inventario";
import {
  agregarLinea,
  calcularCarrito,
  cambiarCantidad,
  generarComprobante,
  tiposPermitidos,
  validarLinea,
} from "./carrito";

const productos = new Map(PRODUCTOS_DEMO.map((p) => [p.id, aVistaEmpleado(p)]));
const p = (codigo: string) => [...productos.values()].find((x) => x.codigo === codigo)!;

const folder = p("LIB-0034"); // Q 2.00 / mayoreo 10+ a Q 1.50 / paquete Q 150
const resma = p("LIB-0021"); // Q 42, aplica consumo interno
const marco = p("VAR-0003"); // Productos Varios
const usb = p("TEC-0012");

describe("tiposPermitidos (secciones 8.7 y 11.4)", () => {
  it("consumo interno solo si el producto lo permite y no es de Varios", () => {
    expect(tiposPermitidos(resma)).toEqual(["venta", "consumo_interno", "merma"]);
    expect(tiposPermitidos(folder)).toEqual(["venta", "merma"]);
    expect(tiposPermitidos({ ...marco, aplicaConsumoInterno: true })).not.toContain(
      "consumo_interno",
    );
  });
});

describe("validarLinea", () => {
  it("la merma exige motivo", () => {
    expect(
      validarLinea({ productoId: usb.id, tipo: "merma", presentacion: "unidad", cantidad: 1 }, usb),
    ).toMatch(/motivo/);
    expect(
      validarLinea(
        {
          productoId: usb.id,
          tipo: "merma",
          presentacion: "unidad",
          cantidad: 1,
          motivo: "dañado",
        },
        usb,
      ),
    ).toBeNull();
  });

  it("rechaza vender por paquete algo que no es fraccionable", () => {
    expect(
      validarLinea(
        { productoId: usb.id, tipo: "venta", presentacion: "paquete", cantidad: 1 },
        usb,
      ),
    ).not.toBeNull();
  });

  it("rechaza consumo interno donde no aplica", () => {
    expect(
      validarLinea(
        { productoId: marco.id, tipo: "consumo_interno", presentacion: "unidad", cantidad: 1 },
        marco,
      ),
    ).not.toBeNull();
  });
});

describe("agregarLinea / cambiarCantidad", () => {
  const l: LineaCarrito = {
    productoId: folder.id,
    tipo: "venta",
    presentacion: "unidad",
    cantidad: 4,
  };

  it("suma cantidades de la misma línea en vez de duplicarla", () => {
    const c = agregarLinea(agregarLinea([], l), { ...l, cantidad: 6 });
    expect(c).toHaveLength(1);
    expect(c[0]!.cantidad).toBe(10);
  });

  it("mantiene separadas venta y consumo interno, o unidad y paquete", () => {
    let c = agregarLinea([], l);
    c = agregarLinea(c, { ...l, presentacion: "paquete", cantidad: 1 });
    c = agregarLinea(c, { ...l, tipo: "merma", motivo: "humedad" });
    expect(c).toHaveLength(3);
  });

  it("cantidad 0 quita la línea", () => {
    expect(cambiarCantidad([l], 0, 0)).toEqual([]);
  });
});

describe("calcularCarrito", () => {
  const carrito: LineaCarrito[] = [
    { productoId: folder.id, tipo: "venta", presentacion: "unidad", cantidad: 12 }, // 12 × 1.50 = 18.00
    { productoId: folder.id, tipo: "venta", presentacion: "paquete", cantidad: 1 }, // 150.00
    { productoId: resma.id, tipo: "consumo_interno", presentacion: "unidad", cantidad: 1 }, // no suma
    { productoId: usb.id, tipo: "merma", presentacion: "unidad", cantidad: 1, motivo: "roto" }, // no suma
  ];
  const r = calcularCarrito(carrito, productos);

  it("el total solo suma las ventas", () => {
    expect(r.total).toBe(168);
    expect(r.lineas.map((x) => x.subtotal)).toEqual([18, 150, 0, 0]);
  });

  it("avisa el cambio de precio por mayoreo (pantalla 5)", () => {
    expect(r.avisosMayoreo).toEqual([{ nombre: "Folder tamaño carta", de: 2, a: 1.5 }]);
  });

  it("cuenta cada tipo de movimiento", () => {
    expect([r.cantidadVentas, r.cantidadConsumos, r.cantidadMermas]).toEqual([2, 1, 1]);
  });

  it("evita errores de centavos", () => {
    const papel = p("LIB-0042"); // Q 0.50 → 0.35 desde 20
    const c = calcularCarrito(
      [{ productoId: papel.id, tipo: "venta", presentacion: "unidad", cantidad: 3 }],
      productos,
    );
    expect(c.total).toBe(1.5);
  });
});

describe("generarComprobante (sección 11.3)", () => {
  it("incluye solo las ventas, con fecha y quién atendió", () => {
    const calc = calcularCarrito(
      [
        { productoId: usb.id, tipo: "venta", presentacion: "unidad", cantidad: 2 },
        { productoId: resma.id, tipo: "consumo_interno", presentacion: "unidad", cantidad: 1 },
      ],
      productos,
    );
    const c = generarComprobante(calc, {
      id: "c-1",
      fecha: "2026-11-26T12:40:00-06:00",
      atendio: "Carlos",
      usuario: "carlos",
    })!;
    expect(c.lineas).toHaveLength(1);
    expect(c.total).toBe(130);
    expect(c.atendio).toBe("Carlos");
  });

  it("consumo interno o merma solos no generan comprobante", () => {
    const calc = calcularCarrito(
      [{ productoId: resma.id, tipo: "consumo_interno", presentacion: "unidad", cantidad: 1 }],
      productos,
    );
    expect(
      generarComprobante(calc, { id: "c-2", fecha: "", atendio: "Ana", usuario: "ana" }),
    ).toBeNull();
  });
});
