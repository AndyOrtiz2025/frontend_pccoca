import { describe, expect, it } from "vitest";
import type { Cargo, PagoCuenta } from "@/types/pendiente";
import { calcularSaldo, montoPagoCargos } from "./cuentas";

const cargo = (cantidad: number, precioUnitario: number) => ({ cantidad, precioUnitario }) as Cargo;
const pago = (monto: number) => ({ monto }) as PagoCuenta;

describe("saldo de la cuenta", () => {
  it("cargos − pagos, sin errores de centavos", () => {
    expect(calcularSaldo([cargo(3, 0.1), cargo(1, 0.2)], [pago(0.3)])).toEqual({
      totalCargos: 0.5,
      totalPagado: 0.3,
      saldo: 0.2,
    });
  });

  it("nunca negativo", () => {
    expect(calcularSaldo([cargo(1, 10)], [pago(15)]).saldo).toBe(0);
  });

  it("pagar seleccionados cobra como máximo el saldo", () => {
    expect(montoPagoCargos([cargo(1, 30)], 20)).toBe(20);
    expect(montoPagoCargos([cargo(2, 5)], 20)).toBe(10);
  });
});
