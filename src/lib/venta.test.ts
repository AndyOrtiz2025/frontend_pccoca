import { beforeEach, describe, expect, it } from "vitest";
import {
  abrirPaqueteProducto,
  obtenerProductosAdmin,
  registrarVenta,
  ReglaNegocioError,
} from "./api";
import { almacen, reiniciarAlmacen } from "./mocks/store";

const id = (codigo: string) => almacen().productos.find((p) => p.codigo === codigo)!.id;
const stock = (codigo: string) => almacen().productos.find((p) => p.codigo === codigo)!.stock;

beforeEach(() => reiniciarAlmacen());

describe("registrarVenta", () => {
  it("calcula precios en el servidor, descuenta stock y genera comprobante", async () => {
    const r = await registrarVenta(
      [{ productoId: id("LIB-0034"), tipo: "venta", presentacion: "unidad", cantidad: 8 }],
      "Carlos",
    );
    expect(r.comprobante?.total).toBe(16);
    expect(r.comprobante?.atendio).toBe("Carlos");
    expect(stock("LIB-0034")).toMatchObject({ sueltas: 0, paquetes: 3 });
    expect(JSON.stringify(r)).not.toMatch(/costo/i);
  });

  it("consumo interno y merma: descuentan stock, no generan comprobante y quedan registrados", async () => {
    const r = await registrarVenta(
      [
        {
          productoId: id("LIB-0021"),
          tipo: "consumo_interno",
          presentacion: "unidad",
          cantidad: 1,
        },
        {
          productoId: id("TEC-0012"),
          tipo: "merma",
          presentacion: "unidad",
          cantidad: 1,
          motivo: "roto",
        },
      ],
      "Ana",
    );
    expect(r.comprobante).toBeNull();
    expect([r.consumos, r.mermas]).toEqual([1, 1]);
    expect(almacen().movimientos.map((m) => m.tipo)).toEqual(["consumo_interno", "merma"]);
    expect(stock("LIB-0021")).toMatchObject({ disponible: 17 });
  });

  it("todo o nada: si una línea no tiene stock, no se descuenta ninguna", async () => {
    await expect(
      registrarVenta(
        [
          { productoId: id("TEC-0012"), tipo: "venta", presentacion: "unidad", cantidad: 1 },
          { productoId: id("LIB-0070"), tipo: "venta", presentacion: "unidad", cantidad: 1 }, // agotado
        ],
        "Carlos",
      ),
    ).rejects.toThrow(ReglaNegocioError);
    expect(stock("TEC-0012")).toMatchObject({ disponible: 14 });
    expect(almacen().comprobantes).toHaveLength(0);
  });

  it("dos líneas del mismo producto suman contra el mismo stock", async () => {
    // Cable HDMI tiene 4: 3 venta + 2 merma = 5 → no alcanza
    await expect(
      registrarVenta(
        [
          { productoId: id("TEC-0015"), tipo: "venta", presentacion: "unidad", cantidad: 3 },
          {
            productoId: id("TEC-0015"),
            tipo: "merma",
            presentacion: "unidad",
            cantidad: 2,
            motivo: "x",
          },
        ],
        "Carlos",
      ),
    ).rejects.toThrow(/stock/);
  });

  it("aplica las reglas aunque el navegador mande algo indebido", async () => {
    await expect(
      registrarVenta(
        [
          {
            productoId: id("VAR-0003"),
            tipo: "consumo_interno",
            presentacion: "unidad",
            cantidad: 1,
          },
        ],
        "X",
      ),
    ).rejects.toThrow(/consumo interno/);
    await expect(
      registrarVenta(
        [{ productoId: id("TEC-0012"), tipo: "merma", presentacion: "unidad", cantidad: 1 }],
        "X",
      ),
    ).rejects.toThrow(/motivo/);
    await expect(
      registrarVenta(
        [{ productoId: "no-existe", tipo: "venta", presentacion: "unidad", cantidad: 1 }],
        "X",
      ),
    ).rejects.toThrow();
    await expect(registrarVenta([], "X")).rejects.toThrow(/vacío/);
  });

  it("el admin ve el stock actualizado después de la venta", async () => {
    await registrarVenta(
      [{ productoId: id("LIB-0050"), tipo: "venta", presentacion: "unidad", cantidad: 10 }],
      "Carlos",
    );
    const lib = await obtenerProductosAdmin("paola", "libreria");
    expect(lib.find((p) => p.codigo === "LIB-0050")!.stock).toMatchObject({ disponible: 50 });
  });
});

describe("abrirPaqueteProducto", () => {
  it("convierte 1 paquete en unidades sueltas y deja registro", async () => {
    const p = await abrirPaqueteProducto(id("LIB-0042"), "Carlos"); // 4 paquetes, 0 sueltas
    expect(stock("LIB-0042")).toMatchObject({ paquetes: 3, sueltas: 100 });
    expect(p.disponibilidad.sinSueltas).toBe(false);
    expect(almacen().conversiones).toHaveLength(1);
  });

  it("no abre si no hay paquetes o no es fraccionable", async () => {
    await expect(abrirPaqueteProducto(id("LIB-0035"), "Carlos")).rejects.toThrow(ReglaNegocioError);
    await expect(abrirPaqueteProducto(id("TEC-0012"), "Carlos")).rejects.toThrow(ReglaNegocioError);
  });
});
