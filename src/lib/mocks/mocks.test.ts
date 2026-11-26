import { describe, expect, it } from "vitest";
import { PRODUCTOS_DEMO } from "./productos";
import { MODULOS_TRAMITE_DEMO, TRAMITES_DEMO } from "./tramites";

/** Los datos de prueba deben respetar las mismas reglas que exigirá el backend. */
describe("datos de prueba consistentes", () => {
  it("códigos y códigos de barras únicos", () => {
    const codigos = PRODUCTOS_DEMO.map((p) => p.codigo);
    const barras = PRODUCTOS_DEMO.map((p) => p.codigoBarras);
    expect(new Set(codigos).size).toBe(codigos.length);
    expect(new Set(barras).size).toBe(barras.length);
  });

  it("Tecnología sin mayoreo y Varios sin consumo interno", () => {
    for (const p of PRODUCTOS_DEMO) {
      if (p.categoria === "tecnologia") expect(p.mayoreo).toBeUndefined();
      if (p.categoria === "varios") expect(p.aplicaConsumoInterno).toBe(false);
    }
  });

  it("el mayoreo siempre es más barato que el precio normal", () => {
    for (const p of PRODUCTOS_DEMO) if (p.mayoreo) expect(p.mayoreo.precio).toBeLessThan(p.precio);
  });

  it("los fraccionables tienen stock de dos contadores", () => {
    for (const p of PRODUCTOS_DEMO) expect(p.stock.tipo === "fraccionable").toBe(!!p.fraccionable);
  });

  it("cada trámite pertenece a un módulo existente", () => {
    const modulos = new Set(MODULOS_TRAMITE_DEMO.map((m) => m.id));
    for (const t of TRAMITES_DEMO) expect(modulos.has(t.moduloId)).toBe(true);
  });

  it("el catálogo de trámites coincide con la documentación (10 SAT, 3 CGC, 3 RENAP, 9 Otros)", () => {
    const cuenta = (m: string) => TRAMITES_DEMO.filter((t) => t.moduloId === m).length;
    expect([cuenta("sat"), cuenta("cgc"), cuenta("renap"), cuenta("otros")]).toEqual([10, 3, 3, 9]);
  });
});
