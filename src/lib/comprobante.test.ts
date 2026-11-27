import { describe, expect, it } from "vitest";
import type { Comprobante } from "@/types/movimiento";
import {
  fechaComprobante,
  nombreArchivoComprobante,
  nombreLinea,
  numeroComprobante,
  totalArticulos,
} from "./comprobante";

const c: Comprobante = {
  id: "V-3f2a9c1b-0000-4000-8000-000000000000",
  fecha: "2026-11-27T16:47:00Z", // 10:47 a. m. en Guatemala
  atendio: "Carlos",
  usuario: "carlos",
  total: 53,
  lineas: [
    {
      codigo: "A",
      nombre: "Cuaderno",
      presentacion: "unidad",
      cantidad: 3,
      precioUnitario: 15,
      subtotal: 45,
    },
    {
      codigo: "B",
      nombre: "Hojas",
      presentacion: "paquete",
      cantidad: 1,
      precioUnitario: 8,
      subtotal: 8,
    },
  ],
};

describe("comprobante", () => {
  it("número corto y nombre de archivo con hora de Guatemala", () => {
    expect(numeroComprobante(c)).toBe("3F2A9C1B");
    expect(nombreArchivoComprobante(c)).toBe("comprobante-pc-coca-2026-11-27-1047-3F2A9C1B.pdf");
    expect(fechaComprobante(c)).toMatch(/27\/11\/2026.*10:47/);
  });

  it("la venta de las 11:59 p. m. lleva la fecha de ese día en el archivo", () => {
    expect(nombreArchivoComprobante({ ...c, fecha: "2026-11-28T05:59:00Z" })).toContain(
      "2026-11-27-2359",
    );
  });

  it("presentación y total de artículos", () => {
    expect(nombreLinea(c.lineas[1]!)).toBe("Hojas (paquete)");
    expect(totalArticulos(c)).toBe(4);
  });
});
