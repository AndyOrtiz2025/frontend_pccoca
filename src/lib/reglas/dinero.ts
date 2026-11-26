/** Redondea a centavos para evitar errores de punto flotante (0.1 + 0.2). */
export function centavos(monto: number): number {
  return Math.round((monto + Number.EPSILON) * 100) / 100;
}
