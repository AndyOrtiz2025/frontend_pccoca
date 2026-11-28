import { beforeEach, describe, expect, it } from "vitest";
import {
  buscarVentaParaDevolucion,
  obtenerDevoluciones,
  obtenerHistorialProducto,
  registrarDevolucion,
  registrarVenta,
  SinPermisoError,
} from "./api";
import { numeroComprobante } from "./comprobante";
import { almacen, reiniciarAlmacen } from "./mocks/store";
import { cuadreCambio, diasEntre, fueraDePlazo, numeroDevolucion } from "./reglas/devoluciones";
import { devolucionSchema, type DevolucionInput } from "@/schemas/devolucion.schema";

beforeEach(() => reiniciarAlmacen());

const carlos = { usuario: "carlos", nombre: "Carlos" };
const dia = (d: string, h = "16:00") => new Date(`${d}T${h}:00Z`);
const prod = (id: string) => almacen().productos.find((p) => p.id === id)!;
const stock = (id: string) => {
  const s = prod(id).stock;
  return s.tipo === "simple" ? s.disponible : `${s.paquetes}p+${s.sueltas}u`;
};

/** Venta del 25/11: 2 cuadernos (Q 15) y 1 memoria USB. */
async function venta() {
  const r = await registrarVenta(
    [
      { productoId: "p-lib-0050", tipo: "venta", presentacion: "unidad", cantidad: 2 },
      { productoId: "p-tec-0012", tipo: "venta", presentacion: "unidad", cantidad: 1 },
    ],
    carlos,
    dia("2026-11-25"),
  );
  return r.comprobante!;
}
const devolver = (datos: object, ahora = dia("2026-11-27")) =>
  registrarDevolucion(devolucionSchema.parse(datos) as DevolucionInput, carlos, ahora);

describe("Reglas de devoluciones", () => {
  it("cuenta días, plazo y cuadre del cambio", () => {
    expect(diasEntre("2026-11-24", "2026-11-27")).toBe(3);
    expect(diasEntre("2026-11-30", "2026-12-01")).toBe(1);
    expect(fueraDePlazo(3)).toBe(false);
    expect(fueraDePlazo(4)).toBe(true);
    expect(cuadreCambio(30, 25)).toEqual({ falta: 5, diferencia: 0 });
    expect(cuadreCambio(30, 30)).toEqual({ falta: 0, diferencia: 0 });
    expect(cuadreCambio(30, 32.5)).toEqual({ falta: 0, diferencia: 2.5 });
    expect(numeroDevolucion({ id: "D-3f2a9c1b-xx" })).toBe("D-3F2A9C");
  });

  it("valida lo que llega del formulario", () => {
    const base = {
      fechaCompra: "2026-11-26",
      devuelto: [{ productoId: "a", presentacion: "unidad", cantidad: 1, estado: "buen_estado" }],
      llevo: [{ productoId: "b", presentacion: "unidad", cantidad: 1 }],
    };
    expect(devolucionSchema.safeParse(base).success).toBe(true);
    expect(
      devolucionSchema.safeParse({ ...base, fechaCompra: undefined }).error?.issues[0]?.message,
    ).toBe("Escribe cuándo lo compró");
    expect(devolucionSchema.safeParse({ ...base, llevo: [] }).error?.issues[0]?.message).toContain(
      "no se devuelve en dinero",
    );
  });
});

describe("Devoluciones", () => {
  it("busca la venta por número con lo que se puede devolver", async () => {
    const c = await venta();
    const v = await buscarVentaParaDevolucion(
      numeroComprobante(c).toLowerCase(),
      dia("2026-11-27"),
    );
    expect(v).toMatchObject({ dias: 2, atendio: "Carlos" });
    expect(v?.lineas.map((l) => [l.nombre, l.precioUnitario, l.disponibles])).toEqual([
      ["Cuaderno universitario", 15, 2],
      ["Memoria USB 32GB", expect.any(Number), 1],
    ]);
    expect(await buscarVentaParaDevolucion("ZZZZZZZZ")).toBeNull();
  });

  it("buen estado vuelve al stock y se cambia por otro; paga la diferencia", async () => {
    const c = await venta();
    const antes = stock("p-lib-0050");
    const r = await devolver({
      comprobanteId: c.id,
      devuelto: [
        { productoId: "p-lib-0050", presentacion: "unidad", cantidad: 2, estado: "buen_estado" },
      ],
      // Q 30 de saldo → se lleva 1 resma (Q 42): paga Q 12.
      llevo: [{ productoId: "p-lib-0021", presentacion: "unidad", cantidad: 1 }],
    });
    expect(r.devolucion).toMatchObject({ saldo: 30, totalLlevo: 42, diferencia: 12, dias: 2 });
    expect(stock("p-lib-0050")).toBe((antes as number) + 2);
    expect(r.devolucion.numeroCompra).toBe(numeroComprobante(c));
    // Ya no se puede devolver otra vez lo mismo.
    const v = await buscarVentaParaDevolucion(numeroComprobante(c), dia("2026-11-27"));
    expect(v?.lineas[0]?.disponibles).toBe(0);
    await expect(
      devolver({
        comprobanteId: c.id,
        devuelto: [
          { productoId: "p-lib-0050", presentacion: "unidad", cantidad: 1, estado: "buen_estado" },
        ],
        llevo: [{ productoId: "p-lib-0050", presentacion: "unidad", cantidad: 1 }],
      }),
    ).rejects.toThrow("ya se devolvió completo");
  });

  it("defectuoso no vuelve al stock y queda como reclamo al proveedor; cambio igual", async () => {
    const c = await venta();
    const usb = stock("p-tec-0012") as number;
    const r = await devolver({
      comprobanteId: c.id,
      devuelto: [
        {
          productoId: "p-tec-0012",
          presentacion: "unidad",
          cantidad: 1,
          estado: "defectuoso",
          nota: "No la reconoce la computadora",
        },
      ],
      llevo: [{ productoId: "p-tec-0012", presentacion: "unidad", cantidad: 1 }],
    });
    expect(r.devolucion.diferencia).toBe(0);
    // Salió una nueva y la dañada no volvió.
    expect(stock("p-tec-0012")).toBe(usb - 1);
    const reclamo = almacen().reclamos.at(-1)!;
    expect(reclamo).toMatchObject({
      proveedorId: "prov-t1",
      devolucionId: r.devolucion.id,
      cantidad: 1,
      estado: "pendiente",
      motivo: "No la reconoce la computadora",
    });
  });

  it("nunca devuelve dinero: el saldo se usa completo", async () => {
    const c = await venta();
    await expect(
      devolver({
        comprobanteId: c.id,
        devuelto: [
          { productoId: "p-lib-0050", presentacion: "unidad", cantidad: 2, estado: "buen_estado" },
        ],
        // Q 30 de saldo y solo se lleva Q 2.
        llevo: [{ productoId: "p-lib-0061", presentacion: "unidad", cantidad: 1 }],
      }),
    ).rejects.toThrow("Falta escoger Q 28.00");
    expect(almacen().devoluciones).toHaveLength(0);
  });

  it("más de 3 días: necesita autorización de Paola u Oscar", async () => {
    const c = await venta();
    const datos = {
      comprobanteId: c.id,
      devuelto: [
        { productoId: "p-lib-0050", presentacion: "unidad", cantidad: 1, estado: "buen_estado" },
      ],
      llevo: [{ productoId: "p-lib-0050", presentacion: "unidad", cantidad: 1 }],
    };
    await expect(devolver(datos, dia("2026-11-29"))).rejects.toThrow("Pasaron 4 días");
    const r = await devolver(
      { ...datos, autorizo: { por: "Paola", motivo: "Cliente frecuente" } },
      dia("2026-11-29"),
    );
    expect(r.devolucion).toMatchObject({ dias: 4, autorizo: { por: "Paola" } });
  });

  it("sin comprobante: precio actual y fecha que dice el cliente", async () => {
    const r = await devolver({
      fechaCompra: "2026-11-26",
      devuelto: [
        { productoId: "p-lib-0045", presentacion: "paquete", cantidad: 1, estado: "buen_estado" },
      ],
      llevo: [{ productoId: "p-lib-0021", presentacion: "unidad", cantidad: 1 }],
    });
    // Caja de lápices a Q 22 → resma Q 42: paga Q 20.
    expect(r.devolucion).toMatchObject({ saldo: 22, diferencia: 20, dias: 1 });
    expect(r.devolucion.devuelto[0]).toMatchObject({ nombrePaquete: "Caja", precioUnitario: 22 });
    await expect(
      devolver({
        fechaCompra: "2026-11-28",
        devuelto: [
          { productoId: "p-lib-0050", presentacion: "unidad", cantidad: 1, estado: "buen_estado" },
        ],
        llevo: [{ productoId: "p-lib-0050", presentacion: "unidad", cantidad: 1 }],
      }),
    ).rejects.toThrow("futura");
  });

  it("no deja devolver más de lo vendido ni productos que no estaban", async () => {
    const c = await venta();
    const llevo = [{ productoId: "p-lib-0021", presentacion: "unidad", cantidad: 1 }];
    await expect(
      devolver({
        comprobanteId: c.id,
        devuelto: [
          { productoId: "p-lib-0050", presentacion: "unidad", cantidad: 3, estado: "buen_estado" },
        ],
        llevo,
      }),
    ).rejects.toThrow("solo se pueden devolver 2");
    await expect(
      devolver({
        comprobanteId: c.id,
        devuelto: [
          { productoId: "p-lib-0021", presentacion: "unidad", cantidad: 1, estado: "buen_estado" },
        ],
        llevo,
      }),
    ).rejects.toThrow("no está en esa venta");
  });

  it("si no alcanza el stock de lo que se lleva, no se guarda nada", async () => {
    const c = await venta();
    const cuadernos = stock("p-lib-0050");
    await expect(
      devolver({
        comprobanteId: c.id,
        devuelto: [
          { productoId: "p-lib-0050", presentacion: "unidad", cantidad: 2, estado: "buen_estado" },
        ],
        llevo: [{ productoId: "p-lib-0061", presentacion: "unidad", cantidad: 500 }],
      }),
    ).rejects.toThrow();
    expect(stock("p-lib-0050")).toBe(cuadernos);
  });

  it("queda en el historial del producto y en la lista de Paola", async () => {
    // Las ventas de prueba usan la hora real: se quitan para que el orden sea el de esta prueba.
    almacen().comprobantes = [];
    const c = await venta();
    await devolver({
      comprobanteId: c.id,
      devuelto: [
        { productoId: "p-lib-0050", presentacion: "unidad", cantidad: 2, estado: "buen_estado" },
      ],
      llevo: [{ productoId: "p-lib-0021", presentacion: "unidad", cantidad: 1 }],
    });
    const h = await obtenerHistorialProducto("paola", "p-lib-0050");
    expect(h[0]).toMatchObject({ tipo: "devolucion", cambio: { unidades: 2 } });
    const resma = await obtenerHistorialProducto("paola", "p-lib-0021");
    expect(resma[0]).toMatchObject({ tipo: "cambio", cambio: { unidades: -1 } });
    expect(await obtenerDevoluciones("paola")).toHaveLength(1);
    await expect(obtenerDevoluciones("empleado")).rejects.toThrow(SinPermisoError);
  });
});
