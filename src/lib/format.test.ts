import { describe, expect, it } from "vitest";
import { formatContador, formatPrecio, formatQ, ocultarCorreo } from "./format";

describe("formatQ", () => {
  it("usa el formato Q 1,250.00", () => {
    expect(formatQ(1250)).toBe("Q 1,250.00");
    expect(formatQ(1.5)).toBe("Q 1.50");
    expect(formatQ(0)).toBe("Q 0.00");
  });

  it("pone el signo antes de la Q", () => {
    expect(formatQ(-35)).toBe("-Q 35.00");
  });
});

describe("formatContador", () => {
  it("muestra 9+ desde 10", () => {
    expect(formatContador(9)).toBe("9");
    expect(formatContador(10)).toBe("9+");
  });
});

describe("ocultarCorreo", () => {
  it("deja solo la primera letra", () => {
    expect(ocultarCorreo("paola@gmail.com")).toBe("p***@gmail.com");
  });
});

describe("formatPrecio", () => {
  it("fijo, rango y pendiente", () => {
    expect(formatPrecio({ monto: 80 })).toBe("Q 80.00");
    expect(formatPrecio({ monto: 700, montoMax: 1000 })).toBe("Q 700.00 – Q 1,000.00");
    expect(formatPrecio({ monto: null })).toBe("Pendiente");
  });
});
