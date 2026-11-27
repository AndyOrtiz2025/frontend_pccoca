import { describe, expect, it } from "vitest";
import { formatFecha, haceCuanto } from "./fechas";

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
