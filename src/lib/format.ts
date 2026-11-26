const quetzales = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formato de moneda de la guía: "Q 1,250.00". */
export function formatQ(monto: number): string {
  const signo = monto < 0 ? "-" : "";
  return `${signo}Q ${quetzales.format(Math.abs(monto))}`;
}

/** Contador de badge: "9+" a partir de 10. */
export function formatContador(n: number): string {
  return n > 9 ? "9+" : String(n);
}
