import type { Cargo, PagoCuenta } from "@/types/pendiente";
import { centavos } from "./dinero";

export const totalCargo = (c: Pick<Cargo, "cantidad" | "precioUnitario">) =>
  centavos(c.cantidad * c.precioUnitario);

/** Saldo = todo lo que se llevó − todo lo que ha pagado. Nunca negativo. */
export function calcularSaldo(cargos: Cargo[], pagos: PagoCuenta[]) {
  const totalCargos = centavos(cargos.reduce((s, c) => s + totalCargo(c), 0));
  const totalPagado = centavos(pagos.reduce((s, p) => s + p.monto, 0));
  return { totalCargos, totalPagado, saldo: Math.max(0, centavos(totalCargos - totalPagado)) };
}

/** Cargos que todavía no se pagaron con "Pagar seleccionados". */
export const cargosPendientes = (cargos: Cargo[]) => cargos.filter((c) => !c.pagoId);

/**
 * Monto a cobrar al pagar cargos seleccionados. Si ya había abonos, nunca cobra más que el saldo
 * (ej. debe Q 20.00 por abonos previos y elige un cargo de Q 30.00 → paga Q 20.00).
 */
export function montoPagoCargos(seleccionados: Cargo[], saldo: number) {
  return Math.min(centavos(seleccionados.reduce((s, c) => s + totalCargo(c), 0)), saldo);
}
