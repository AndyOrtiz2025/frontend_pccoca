import { describe, expect, it } from "vitest";
import { etiquetaStock, nivelStock } from "./stock";

describe("nivelStock (semáforo, sección 11.1)", () => {
  it("verde por encima del 50%", () => {
    expect(nivelStock(51, 100)).toBe("ok");
  });

  it("naranja en el 50% o por debajo", () => {
    expect(nivelStock(50, 100)).toBe("bajo");
    expect(nivelStock(6, 100)).toBe("bajo");
  });

  it("rojo con menos de 5 unidades, aunque sea más del 50%", () => {
    expect(nivelStock(4, 100)).toBe("critico");
    expect(nivelStock(4, 6)).toBe("critico");
    expect(nivelStock(0, 100)).toBe("critico");
  });

  it("exactamente 5 unidades ya no es rojo", () => {
    expect(nivelStock(5, 8)).toBe("ok");
  });
});

describe("etiquetaStock", () => {
  it("no revela la cantidad exacta", () => {
    expect(etiquetaStock("ok", 80)).toBe("Disponible");
    expect(etiquetaStock("bajo", 30)).toBe("Stock bajo");
    expect(etiquetaStock("critico", 3)).toBe("Últimas unidades");
    expect(etiquetaStock("critico", 0)).toBe("Agotado");
  });
});
