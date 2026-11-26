import { describe, expect, it } from "vitest";
import { estadosDisponibles, notificaEmpleados, puedeCambiarEstado } from "./procesos";

const tramite = (estado: "recibido" | "en_proceso" | "listo" | "entregado") =>
  ({ estado, responsable: "paola" }) as const;
const servicio = { estado: "en_proceso", responsable: "oscar" } as const;

describe("estados de trámites y servicios (sección 11.8)", () => {
  it("Paola mueve sus trámites entre Recibido, En proceso y Listo", () => {
    expect(estadosDisponibles("paola", tramite("recibido"))).toEqual(["en_proceso", "listo"]);
    expect(puedeCambiarEstado("paola", tramite("listo"), "en_proceso")).toBe(true);
  });

  it("Paola y Oscar no marcan Entregado", () => {
    expect(puedeCambiarEstado("paola", tramite("listo"), "entregado")).toBe(false);
  });

  it("el Empleado solo marca Entregado cuando está Listo", () => {
    expect(estadosDisponibles("empleado", tramite("listo"))).toEqual(["entregado"]);
    expect(estadosDisponibles("empleado", tramite("en_proceso"))).toEqual([]);
  });

  it("Paola no toca servicios de Oscar ni al revés", () => {
    expect(estadosDisponibles("paola", servicio)).toEqual([]);
    expect(estadosDisponibles("oscar", tramite("recibido"))).toEqual([]);
  });

  it("un proceso entregado ya no cambia", () => {
    expect(estadosDisponibles("paola", tramite("entregado"))).toEqual([]);
    expect(estadosDisponibles("empleado", tramite("entregado"))).toEqual([]);
  });

  it("Listo para entregar notifica a los empleados", () => {
    expect(notificaEmpleados("listo")).toBe(true);
    expect(notificaEmpleados("en_proceso")).toBe(false);
  });
});
