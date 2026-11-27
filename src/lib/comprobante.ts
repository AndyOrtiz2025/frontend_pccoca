import type { Comprobante, LineaComprobante } from "@/types/movimiento";

/** Datos fijos del negocio que salen en el comprobante. */
export const NEGOCIO = {
  nombre: "PC Coca",
  giro: "Librería · Tecnología · Servicios",
  lugar: "San Pedro Necta, Huehuetenango",
} as const;

const fechaHora = new Intl.DateTimeFormat("es-GT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Guatemala",
});
const partes = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Guatemala",
});

/** "3F2A9C1B": número corto para encontrar la venta (sale del id, no es correlativo de SAT). */
export function numeroComprobante(c: Pick<Comprobante, "id">): string {
  return c.id
    .replace(/^V-/, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 8)
    .toUpperCase();
}

/** "27/11/2026, 10:47 a. m." en hora de Guatemala. */
export function fechaComprobante(c: Pick<Comprobante, "fecha">): string {
  return fechaHora.format(new Date(c.fecha));
}

/** "comprobante-pc-coca-2026-11-27-1047-3F2A9C1B.pdf". */
export function nombreArchivoComprobante(c: Pick<Comprobante, "id" | "fecha">): string {
  const p = Object.fromEntries(
    partes.formatToParts(new Date(c.fecha)).map((x) => [x.type, x.value]),
  );
  return `comprobante-pc-coca-${p.year}-${p.month}-${p.day}-${p.hour}${p.minute}-${numeroComprobante(c)}.pdf`;
}

/** "Cuaderno universitario (paquete)". */
export function nombreLinea(l: LineaComprobante): string {
  return l.presentacion === "paquete" ? `${l.nombre} (paquete)` : l.nombre;
}

/** Total de artículos (unidades y paquetes). */
export function totalArticulos(c: Pick<Comprobante, "lineas">): number {
  return c.lineas.reduce((t, l) => t + l.cantidad, 0);
}
