import { describe, expect, it } from "vitest";
import { PRODUCTOS_DEMO } from "@/lib/mocks/productos";
import { armarEtiquetas, repartirEnHojas, tieneCodigoFabricante } from "./etiquetas";

const mongol = PRODUCTOS_DEMO.find((p) => p.codigo === "LIB-0045")!;
const resma = PRODUCTOS_DEMO.find((p) => p.codigo === "LIB-0021")!;

describe("etiquetas", () => {
  it("arma etiquetas de unidad y de caja con su precio", () => {
    const e = armarEtiquetas([{ producto: mongol, unidades: 2, cajas: 1 }]);
    expect(e).toHaveLength(3);
    expect(e[0]).toMatchObject({ codigo: "LIB-0045", precio: 2 });
    expect(e[2]).toMatchObject({ codigo: "LIB-0045-P", precio: 22, detalle: "Caja de 12" });
  });

  it("sin código de caja no imprime etiquetas de caja", () => {
    expect(armarEtiquetas([{ producto: resma, unidades: 1, cajas: 5 }])).toHaveLength(1);
  });

  it("reparte en hojas de 30 y respeta dónde empezar", () => {
    const e = armarEtiquetas([{ producto: resma, unidades: 35, cajas: 0 }]);
    const hojas = repartirEnHojas(e, 4);
    expect(hojas).toHaveLength(2);
    expect(hojas[0]!.slice(0, 3)).toEqual([null, null, null]);
    expect(hojas[0]![3]).not.toBeNull();
    expect(hojas[1]!.filter(Boolean)).toHaveLength(35 - 27);
    expect(hojas[1]).toHaveLength(30);
  });

  it("detecta código del fabricante", () => {
    expect(tieneCodigoFabricante({ codigo: "LIB-0021", codigoBarras: "7501031311309" })).toBe(true);
    expect(tieneCodigoFabricante(mongol)).toBe(false);
  });
});
