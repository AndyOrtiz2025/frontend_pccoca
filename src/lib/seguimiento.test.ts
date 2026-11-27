import { beforeEach, describe, expect, it } from "vitest";
import {
  crearPendiente,
  marcarEntregado,
  obtenerContadores,
  obtenerPendientes,
  obtenerProcesos,
  pagarPendiente,
  ReglaNegocioError,
} from "./api";
import { almacen, reiniciarAlmacen } from "./mocks/store";

beforeEach(() => reiniciarAlmacen());

describe("Seguimiento (sección 8.11)", () => {
  it("no muestra los entregados", async () => {
    const lista = await obtenerProcesos("empleado");
    expect(lista.some((p) => p.estado === "entregado")).toBe(false);
  });

  it("al entregar desaparece de la lista pero queda el registro de quién lo entregó", async () => {
    await marcarEntregado("tp-1", "Carlos");
    expect((await obtenerProcesos("empleado")).some((p) => p.id === "tp-1")).toBe(false);
    expect(almacen().procesos.find((p) => p.id === "tp-1")!.entrega?.entregadoPor).toBe("Carlos");
  });

  it("solo se entrega lo que está Listo para entregar", async () => {
    await expect(marcarEntregado("tp-2", "Carlos")).rejects.toThrow(ReglaNegocioError); // en proceso
    await expect(marcarEntregado("no-existe", "Carlos")).rejects.toThrow(ReglaNegocioError);
  });

  it("la campanita del Empleado cuenta los listos para entregar", async () => {
    expect((await obtenerContadores("empleado")).notificaciones).toBe(2);
    await marcarEntregado("sp-1", "Ana");
    expect((await obtenerContadores("empleado")).notificaciones).toBe(1);
  });
});

describe("Pendientes (sección 8.8)", () => {
  const stockCuaderno = () => almacen().productos.find((p) => p.id === "p-lib-0050")!.stock;

  it("de producto: precio del servidor con mayoreo y descuenta stock", async () => {
    // Cuaderno: Q 15.00, mayoreo desde 12 a Q 13.00; stock 60
    const p = await crearPendiente(
      {
        tipo: "producto",
        cliente: " Rosa ",
        grupo: "individual",
        productoId: "p-lib-0050",
        cantidad: 12,
      },
      "Carlos",
    );
    expect(p).toMatchObject({
      cliente: "Rosa",
      descripcion: "Cuaderno universitario",
      precioUnitario: 13,
    });
    expect(stockCuaderno()).toMatchObject({ disponible: 48 });
  });

  it("de producto sin stock: no se registra", async () => {
    await expect(
      crearPendiente(
        {
          tipo: "producto",
          cliente: "Rosa",
          grupo: "individual",
          productoId: "p-lib-0070",
          cantidad: 1,
        },
        "Carlos",
      ),
    ).rejects.toThrow(/stock/);
  });

  it("libre: guarda descripción y precio escritos", async () => {
    const p = await crearPendiente(
      {
        tipo: "libre",
        cliente: "COCODE",
        grupo: "organizacion",
        descripcion: "Impresiones",
        cantidad: 30,
        precioUnitario: 2,
      },
      "Ana",
    );
    expect(p).toMatchObject({
      descripcion: "Impresiones",
      precioUnitario: 2,
      registradoPor: "Ana",
    });
    expect(p.productoId).toBeUndefined();
  });

  it("Pagado elimina el registro y actualiza el contador", async () => {
    const antes = (await obtenerContadores("empleado")).pendientes!;
    await pagarPendiente("pe-1");
    expect((await obtenerPendientes("empleado")).some((p) => p.id === "pe-1")).toBe(false);
    expect((await obtenerContadores("empleado")).pendientes).toBe(antes - 1);
    await expect(pagarPendiente("pe-1")).rejects.toThrow(ReglaNegocioError);
  });

  it("Paola ve lo que registra el Empleado (solo lectura)", async () => {
    await crearPendiente(
      {
        tipo: "libre",
        cliente: "Juan",
        grupo: "individual",
        descripcion: "Copias",
        cantidad: 10,
        precioUnitario: 0.5,
      },
      "Carlos",
    );
    expect((await obtenerPendientes("paola")).some((p) => p.cliente === "Juan")).toBe(true);
  });
});
