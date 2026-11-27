import { describe, expect, it } from "vitest";
import { barrasCode128, esCodificable, modulosCode128, simbolosCode128 } from "./code128";

describe("Code 128", () => {
  it("dígito de control: (104 + Σ valor × posición) mod 103", () => {
    // P=48 J=42 J=42 1=17 2=18 3=19 C=35 → 104 + 775 = 879 → 879 mod 103 = 55
    const s = simbolosCode128("PJJ123C");
    expect(s[0]).toBe(104);
    expect(s.at(-2)).toBe(55);
    expect(s.at(-1)).toBe(106);
  });

  it("cada símbolo mide 11 módulos y el fin 13, más 10 en blanco por lado", () => {
    const texto = "LIB-0045";
    expect(modulosCode128(texto)).toHaveLength(10 + 11 * (texto.length + 2) + 13 + 10);
  });

  it("empieza y termina con barra (después de la zona en blanco)", () => {
    const m = modulosCode128("LIB-0045-P");
    expect(m.slice(0, 10).every((x) => !x)).toBe(true);
    expect(m[10]).toBe(true);
    expect(m.at(-11)).toBe(true);
    expect(barrasCode128("LIB-0045").length).toBeGreaterThan(10);
  });

  it("rechaza lo que no se puede codificar", () => {
    expect(esCodificable("LIB-0045")).toBe(true);
    expect(esCodificable("Lápiz")).toBe(false);
    expect(() => simbolosCode128("")).toThrow();
  });
});
