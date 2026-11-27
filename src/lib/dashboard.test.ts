import { beforeEach, describe, expect, it } from "vitest";
import { marcarEntregado, obtenerResumenEmpleado, registrarVenta } from "./api";
import { almacen, reiniciarAlmacen } from "./mocks/store";

beforeEach(() => reiniciarAlmacen());

describe("Dashboard del Empleado (pantalla 4)", () => {
  it("cada empleado ve solo sus ventas de hoy", async () => {
    const carlos = await obtenerResumenEmpleado("carlos");
    const ana = await obtenerResumenEmpleado("ana");
    expect(carlos.ventas.ultimas.every((c) => c.usuario === "carlos")).toBe(true);
    expect(ana.ventas.ultimas.every((c) => c.usuario === "ana")).toBe(true);
    expect(ana.ventas.cantidad).toBeLessThan(carlos.ventas.cantidad);
  });

  it("una venta nueva suma al total del vendedor", async () => {
    const antes = (await obtenerResumenEmpleado("carlos")).ventas;
    const id = almacen().productos.find((p) => p.codigo === "LIB-0061")!.id;
    const r = await registrarVenta(
      [{ productoId: id, tipo: "venta", presentacion: "unidad", cantidad: 2 }],
      { usuario: "carlos", nombre: "Carlos" },
    );
    const despues = (await obtenerResumenEmpleado("carlos")).ventas;
    expect(despues.cantidad).toBe(antes.cantidad + 1);
    expect(despues.total).toBe(antes.total + r.comprobante!.total);
    expect(despues.ultimas[0]!.id).toBe(r.comprobante!.id);
  });

  it("listos para entregar y total por cobrar en Pendientes", async () => {
    const r = await obtenerResumenEmpleado("carlos");
    expect(r.listos.map((p) => p.id).sort()).toEqual(["sp-1", "tp-1"]);
    expect(r.porCobrar.total).toBeGreaterThan(0);
    await marcarEntregado("sp-1", "Carlos");
    expect((await obtenerResumenEmpleado("carlos")).listos.map((p) => p.id)).toEqual(["tp-1"]);
  });
});
