import { describe, expect, it } from "vitest";
import { diaDeGuatemala, diaSemanaGuatemala, formatFecha, haceCuanto, saludo } from "./fechas";

describe("fechas", () => {
  it("formatea fechas sin cambiar de día por la zona horaria", () => {
    expect(formatFecha("2026-11-20")).toBe("20/11/2026");
    expect(formatFecha("2026-11-25T23:30:00-06:00")).toBe("25/11/2026");
  });

  it("haceCuanto", () => {
    const ahora = new Date("2026-11-26T12:00:00-06:00");
    expect(haceCuanto("2026-11-26T11:30:00-06:00", ahora)).toBe("Hace 30 min");
    expect(haceCuanto("2026-11-26T09:00:00-06:00", ahora)).toBe("Hace 3 h");
    expect(haceCuanto("2026-11-24T12:00:00-06:00", ahora)).toBe("Hace 2 días");
  });
});

describe("día y saludo en hora de Guatemala (UTC−6)", () => {
  it("11:59 p. m. es de ese día y 12:00 a. m. ya es del siguiente", () => {
    expect(diaDeGuatemala("2026-11-27T05:59:00Z")).toBe("2026-11-26"); // 11:59 p. m. del 26
    expect(diaDeGuatemala("2026-11-27T06:00:00Z")).toBe("2026-11-27"); // 12:00 a. m. del 27
    // Una venta de las 7 p. m. queda guardada en UTC como el día siguiente, pero cuenta hoy.
    expect(diaDeGuatemala("2026-11-27T01:00:00Z")).toBe("2026-11-26");
  });

  it("saludo según la hora", () => {
    expect(saludo(new Date("2026-11-27T11:00:00Z"))).toBe("Buenos días"); // 5:00 a. m.
    expect(saludo(new Date("2026-11-27T17:59:00Z"))).toBe("Buenos días"); // 11:59 a. m.
    expect(saludo(new Date("2026-11-27T18:00:00Z"))).toBe("Buenas tardes"); // 12:00 p. m.
    expect(saludo(new Date("2026-11-28T00:59:00Z"))).toBe("Buenas tardes"); // 6:59 p. m.
    expect(saludo(new Date("2026-11-28T01:00:00Z"))).toBe("Buenas noches"); // 7:00 p. m.
    expect(saludo(new Date("2026-11-27T10:59:00Z"))).toBe("Buenas noches"); // 4:59 a. m.
  });
});

describe("día de la semana en Guatemala", () => {
  it("el viernes 27 a las 11 p. m. sigue siendo viernes aunque en UTC ya sea sábado", () => {
    expect(diaSemanaGuatemala(new Date("2026-11-28T05:00:00Z"))).toBe(5);
    expect(diaSemanaGuatemala(new Date("2026-11-28T06:00:00Z"))).toBe(6);
  });
});
