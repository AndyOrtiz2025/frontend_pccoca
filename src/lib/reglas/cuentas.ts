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

/**
 * Desde cuándo debe: la fecha del cargo más antiguo que todavía no está pagado. Los abonos
 * (montos libres) se aplican a los cargos más antiguos primero. Sin saldo, no debe nada.
 */
export function debeDesde(cargos: Cargo[], pagos: PagoCuenta[]): string | undefined {
  if (calcularSaldo(cargos, pagos).saldo <= 0) return undefined;
  const pendientes = cargosPendientes(cargos).sort((x, y) => x.fecha.localeCompare(y.fecha));
  let abonado = centavos(pagos.filter((p) => p.tipo === "abono").reduce((s, p) => s + p.monto, 0));
  for (const c of pendientes) {
    const total = totalCargo(c);
    if (abonado >= total) abonado = centavos(abonado - total);
    else return c.fecha;
  }
  return pendientes.at(-1)?.fecha;
}
