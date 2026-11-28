import { beforeEach, describe, expect, it } from "vitest";
import {
  cambiarActivoProveedor,
  crearProveedor,
  editarProveedor,
  obtenerDetalleProveedor,
  obtenerHistorialProducto,
  obtenerProveedores,
  obtenerProveedoresAdmin,
  registrarCompra,
  registrarMermaAdmin,
  registrarVenta,
  ReglaNegocioError,
  resolverReclamo,
  SinPermisoError,
} from "./api";
import { almacen, reiniciarAlmacen } from "./mocks/store";
import { proveedorSchema } from "@/schemas/proveedor.schema";

beforeEach(() => reiniciarAlmacen());

const prod = (id: string) => almacen().productos.find((p) => p.id === id)!;
const hoy = new Date("2026-11-27T16:00:00Z"); // 10:00 a. m. en Guatemala
const compra = (lineas: object[], extra: object = {}) =>
  registrarCompra(
    "paola",
    { proveedorId: "prov-3", fecha: "2026-11-27", lineas: lineas as never, ...extra },
    "Paola",
    hoy,
  );

describe("Proveedores", () => {
  it("lista con lo comprado en el mes y reclamos pendientes", async () => {
    const lista = await obtenerProveedoresAdmin("paola", hoy);
    const xela = lista.find((p) => p.id === "prov-3")!;
    expect(xela).toMatchObject({ totalMes: 360, comprasMes: 1, reclamosPendientes: 1 });
    await expect(obtenerProveedoresAdmin("empleado")).rejects.toThrow(SinPermisoError);
  });

  it("crea, no repite nombre, edita y se inactiva (sin borrarse)", async () => {
    const datos = proveedorSchema.parse({
      nombre: "Papelería Xela",
      surte: ["libreria"],
      telefono: "77619034",
    });
    const p = await crearProveedor("paola", datos);
    await expect(crearProveedor("paola", { ...datos, nombre: "papeleria xela" })).rejects.toThrow(
      /Ya existe/,
    );
    await editarProveedor(
      "paola",
      p.id,
      proveedorSchema.parse({ nombre: "Papelería Xela", surte: ["varios"] }),
    );
    expect(almacen().proveedores.find((x) => x.id === p.id)).toMatchObject({
      surte: ["varios"],
      telefono: undefined,
    });
    await cambiarActivoProveedor("paola", p.id, false);
    expect((await obtenerProveedores()).some((x) => x.id === p.id)).toBe(false);
    expect((await obtenerProveedoresAdmin("paola")).some((x) => x.id === p.id)).toBe(true);
  });

  it("valida NIT y teléfono", () => {
    expect(
      proveedorSchema.safeParse({ nombre: "X Y", surte: ["libreria"], nit: "123456-K" }).success,
    ).toBe(true);
    expect(
      proveedorSchema.safeParse({ nombre: "X Y", surte: ["libreria"], nit: "abc" }).success,
    ).toBe(false);
    expect(proveedorSchema.safeParse({ nombre: "X Y", surte: [] }).success).toBe(false);
  });
});

describe("Registrar compra", () => {
  it("suma al stock lo bueno, actualiza el costo y lo dañado queda como reclamo", async () => {
    const r = await compra([
      {
        productoId: "p-lib-0045",
        presentacion: "paquete",
        cantidad: 9,
        danadas: 1,
        costoUnitario: 20,
        motivoDano: "Mojada",
      },
    ]);
    const mongol = prod("p-lib-0045");
    expect(mongol.stock).toMatchObject({ paquetes: 29 });
    expect(mongol.fraccionable?.costoPaquete).toBe(20);
    expect(mongol.costo).toBe(1.67); // 20 ÷ 12
    expect(r.compra.total).toBe(200); // se pagaron las 10
    expect(r.reclamos).toBe(1);
    expect(r.avisos[0]).toMatchObject({ antes: 18, ahora: 20, ganancia: 2 });
  });

  it("caja y unidades del mismo producto en una compra se aplican las dos", async () => {
    await compra([
      {
        productoId: "p-lib-0045",
        presentacion: "paquete",
        cantidad: 2,
        danadas: 0,
        costoUnitario: 18,
      },
      {
        productoId: "p-lib-0045",
        presentacion: "unidad",
        cantidad: 5,
        danadas: 0,
        costoUnitario: 1.5,
      },
    ]);
    expect(prod("p-lib-0045").stock).toMatchObject({ paquetes: 22, sueltas: 5 });
  });

  it("todo o nada: si una línea falla, no cambia ningún stock", async () => {
    const antes = structuredClone(prod("p-lib-0021").stock);
    await expect(
      compra([
        {
          productoId: "p-lib-0021",
          presentacion: "unidad",
          cantidad: 5,
          danadas: 0,
          costoUnitario: 33,
        },
        {
          productoId: "p-tec-0015",
          presentacion: "unidad",
          cantidad: 1,
          danadas: 0,
          costoUnitario: 10,
        },
      ]),
    ).rejects.toThrow(SinPermisoError);
    expect(prod("p-lib-0021").stock).toEqual(antes);
    await expect(
      compra([
        {
          productoId: "p-lib-0021",
          presentacion: "paquete",
          cantidad: 1,
          danadas: 0,
          costoUnitario: 1,
        },
      ]),
    ).rejects.toThrow(/no se maneja por caja/);
  });

  it("no acepta fecha futura ni proveedor inactivo", async () => {
    await expect(
      compra(
        [
          {
            productoId: "p-lib-0021",
            presentacion: "unidad",
            cantidad: 1,
            danadas: 0,
            costoUnitario: 1,
          },
        ],
        {
          fecha: "2026-11-28",
        },
      ),
    ).rejects.toThrow(/futura/);
    await cambiarActivoProveedor("paola", "prov-3", false);
    await expect(
      compra([
        {
          productoId: "p-lib-0021",
          presentacion: "unidad",
          cantidad: 1,
          danadas: 0,
          costoUnitario: 1,
        },
      ]),
    ).rejects.toThrow(/inactivo/);
  });
});

describe("Reclamos al proveedor", () => {
  it("nos repusieron: entra al stock", async () => {
    const antes = prod("p-lib-0045").stock;
    await resolverReclamo("paola", "R-demo-1", { estado: "repuesto" }, "Paola");
    expect(prod("p-lib-0045").stock).toMatchObject({
      paquetes: (antes as { paquetes: number }).paquetes + 1,
    });
    await expect(
      resolverReclamo("paola", "R-demo-1", { estado: "perdida" }, "Paola"),
    ).rejects.toThrow(/ya se resolvió/);
  });

  it("reembolso: por defecto lo que costó, nunca más", async () => {
    await expect(
      resolverReclamo("paola", "R-demo-1", { estado: "reembolsado", monto: 50 }, "Paola"),
    ).rejects.toThrow(ReglaNegocioError);
    const r = await resolverReclamo("paola", "R-demo-1", { estado: "reembolsado" }, "Paola");
    expect(r.resolucion?.monto).toBe(18);
  });

  it("el detalle del proveedor muestra compras y reclamos", async () => {
    const d = (await obtenerDetalleProveedor("paola", "prov-3", hoy))!;
    expect(d.compras[0]?.lineas[0]).toMatchObject({ nombre: "Lápiz Mongol No. 2", danadas: 1 });
    expect(d.reclamos[0]).toMatchObject({ estado: "pendiente", factura: "FAC-8941" });
    expect(d.productosQueSurte).toBeGreaterThanOrEqual(1);
  });
});

describe("Historial del producto", () => {
  it("ventas, compras, mermas y cajas abiertas con el stock que quedó", async () => {
    almacen().comprobantes = []; // las ventas de ejemplo usan la hora real
    await compra([
      {
        productoId: "p-lib-0021",
        presentacion: "unidad",
        cantidad: 5,
        danadas: 0,
        costoUnitario: 33,
      },
    ]);
    await registrarVenta(
      [{ productoId: "p-lib-0021", tipo: "venta", presentacion: "unidad", cantidad: 2 }],
      { usuario: "carlos", nombre: "Carlos" },
      new Date("2026-11-27T17:00:00Z"),
    );
    await registrarMermaAdmin(
      "paola",
      { productoId: "p-lib-0021", presentacion: "unidad", cantidad: 1, motivo: "Mojada" },
      "Paola",
      new Date("2026-11-27T18:00:00Z"),
    );
    const h = await obtenerHistorialProducto("paola", "p-lib-0021");
    expect(h.slice(0, 3).map((e) => e.tipo)).toEqual(["merma", "venta", "compra"]);
    // Stock actual 18 + 5 − 2 − 1 = 20 → después de la merma 20, de la venta 21, de la compra 23
    expect(h.slice(0, 3).map((e) => e.despues.unidades)).toEqual([20, 21, 23]);
    expect(h[2]?.detalle).toBe("Importadora Xela");
    await expect(obtenerHistorialProducto("empleado", "p-lib-0021")).rejects.toThrow(
      SinPermisoError,
    );
  });
});
