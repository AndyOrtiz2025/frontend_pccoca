import { describe, expect, it } from "vitest";
import {
  obtenerCatalogoVenta,
  obtenerEmpleados,
  obtenerEntradas,
  obtenerPendientes,
  obtenerProcesos,
  obtenerProductosAdmin,
  obtenerServicios,
  SinPermisoError,
} from "./api";

describe("permisos de la capa de datos (sección 17)", () => {
  it("el catálogo de venta nunca trae costo", async () => {
    const lib = await obtenerCatalogoVenta("libreria");
    expect(lib.length).toBeGreaterThan(0);
    expect(JSON.stringify(lib)).not.toMatch(/costo/i);
  });

  it("cada admin ve el costo solo de sus categorías", async () => {
    await expect(obtenerProductosAdmin("paola", "libreria")).resolves.toBeDefined();
    await expect(obtenerProductosAdmin("paola", "tecnologia")).rejects.toThrow(SinPermisoError);
    await expect(obtenerProductosAdmin("oscar", "varios")).rejects.toThrow(SinPermisoError);
    await expect(obtenerProductosAdmin("empleado", "libreria")).rejects.toThrow(SinPermisoError);
  });

  it("Paola no ve Servicios Técnicos; Oscar no ve Pendientes", async () => {
    await expect(obtenerServicios("paola")).rejects.toThrow(SinPermisoError);
    await expect(obtenerPendientes("oscar")).rejects.toThrow(SinPermisoError);
  });

  it("solo Oscar ve los usuarios", async () => {
    await expect(obtenerEmpleados("oscar")).resolves.toHaveLength(3);
    await expect(obtenerEmpleados("paola")).rejects.toThrow(SinPermisoError);
  });

  it("cada admin ve solo sus procesos y entradas; el Empleado ve todos los procesos", async () => {
    expect((await obtenerProcesos("paola")).every((p) => p.tipo === "tramite")).toBe(true);
    expect((await obtenerProcesos("oscar")).every((p) => p.tipo === "servicio")).toBe(true);
    expect(new Set((await obtenerProcesos("empleado")).map((p) => p.tipo)).size).toBe(2);
    expect((await obtenerEntradas("oscar")).every((e) => e.tipo === "servicio")).toBe(true);
  });
});
