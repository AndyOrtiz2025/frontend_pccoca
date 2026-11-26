import type { Precio } from "@/types/tramite";

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

/** "p***@gmail.com": confirma a dónde se envió sin mostrar el correo completo. */
export function ocultarCorreo(correo: string): string {
  const [usuario, dominio] = correo.split("@");
  if (!usuario || !dominio) return correo;
  return `${usuario[0]}***@${dominio}`;
}

/**
 * Precio de trámite o servicio: "Q 80.00", "Q 700.00 – Q 1,000.00" o "Pendiente".
 * La nota (ej. "Q 35.00 si es solo ratificación") se muestra aparte.
 */
export function formatPrecio(precio: Precio): string {
  if (precio.monto === null) return "Pendiente";
  if (precio.montoMax !== undefined)
    return `${formatQ(precio.monto)} – ${formatQ(precio.montoMax)}`;
  return formatQ(precio.monto);
}
