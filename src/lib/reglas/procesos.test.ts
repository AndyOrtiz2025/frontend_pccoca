import { describe, expect, it } from "vitest";
import {
  cobroDeServicio,
  estadosDisponibles,
  notificaEmpleados,
  porCobrar,
  puedeCambiarEstado,
} from "./procesos";
import type { ServicioTecnico } from "@/types/servicio";

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

describe("porCobrar", () => {
  it("resta el anticipo y nunca da negativo", () => {
    expect(porCobrar({ total: 30, anticipo: 10 })).toBe(20);
    expect(porCobrar({ total: 150 })).toBe(150);
    expect(porCobrar({ total: 10, anticipo: 15 })).toBe(0);
  });
});

describe("cobroDeServicio", () => {
  const office: ServicioTecnico = {
    id: "srv-office",
    nombre: "Office",
    descripcion: null,
    precio: { monto: 150, montoMax: 250 },
    opciones: [
      { id: "6m", nombre: "6 meses", precio: 150 },
      { id: "1a", nombre: "1 año", precio: 250 },
    ],
  };
  const base = { id: "x", nombre: "Formateo", descripcion: null };

  it("con opciones usa el precio de la opción elegida", () => {
    expect(cobroDeServicio(office, "1a")).toEqual({ total: 250, detalle: "Office · 1 año" });
    expect(() => cobroDeServicio(office)).toThrow(/Elige una opción/);
    expect(() => cobroDeServicio(office, "inventada")).toThrow(/Elige una opción/);
  });

  it("precio fijo lo cobra; sin precio o con rango lo define Oscar", () => {
    expect(cobroDeServicio({ ...base, precio: { monto: 100 } })).toEqual({
      total: 100,
      detalle: "Formateo",
    });
    expect(cobroDeServicio({ ...base, precio: { monto: null } })).toBeUndefined();
    expect(cobroDeServicio({ ...base, precio: { monto: 50, montoMax: 90 } })).toBeUndefined();
    expect(() => cobroDeServicio({ ...base, precio: { monto: 100 } }, "1a")).toThrow();
  });
});
