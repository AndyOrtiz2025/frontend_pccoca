import { beforeEach, describe, expect, it } from "vitest";
import { marcarEntregado, obtenerContadores, obtenerProcesos, ReglaNegocioError } from "./api";
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
