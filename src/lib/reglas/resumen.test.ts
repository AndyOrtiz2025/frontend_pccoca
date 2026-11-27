import { describe, expect, it } from "vitest";
import type { Comprobante } from "@/types/movimiento";
import { resumenVentasDelDia } from "./resumen";

const venta = (id: string, fecha: string, usuario: string, total: number, cantidad = 1) =>
  ({
    id,
    fecha,
    usuario,
    atendio: usuario,
    total,
    lineas: [
      {
        codigo: "X",
        nombre: "X",
        presentacion: "unidad",
        cantidad,
        precioUnitario: total,
        subtotal: total,
      },
    ],
  }) as Comprobante;

describe("resumenVentasDelDia", () => {
  // Ahora: viernes 27 a las 9:30 a. m. de Guatemala.
  const ahora = new Date("2026-11-27T15:30:00Z");
  const comprobantes = [
    venta("ayer-tarde", "2026-11-27T05:59:00Z", "carlos", 100), // jueves 11:59 p. m.
    venta("medianoche", "2026-11-27T06:00:00Z", "carlos", 10, 2), // viernes 12:00 a. m.
    venta("manana", "2026-11-27T15:00:00Z", "carlos", 20.5, 3), // viernes 9:00 a. m.
    venta("de-ana", "2026-11-27T15:10:00Z", "ana", 50),
  ];

  it("solo las del empleado y solo las de hoy (corte a medianoche de Guatemala)", () => {
    const r = resumenVentasDelDia(comprobantes, "carlos", ahora);
    expect(r.total).toBe(30.5);
    expect(r.cantidad).toBe(2);
    expect(r.unidades).toBe(5);
    expect(r.ultimas.map((c) => c.id)).toEqual(["manana", "medianoche"]);
  });

  it("a las 11:59 p. m. del jueves, la venta de esa hora todavía cuenta", () => {
    const r = resumenVentasDelDia(comprobantes, "carlos", new Date("2026-11-27T05:59:30Z"));
    expect(r.ultimas.map((c) => c.id)).toEqual(["ayer-tarde"]);
  });

  it("limita las últimas ventas", () => {
    const muchas = Array.from({ length: 8 }, (_, i) =>
      venta(`v${i}`, `2026-11-27T1${i}:00:00Z`, "carlos", 1),
    );
    expect(
      resumenVentasDelDia(muchas, "carlos", new Date("2026-11-27T23:00:00Z")).ultimas,
    ).toHaveLength(5);
  });
});
