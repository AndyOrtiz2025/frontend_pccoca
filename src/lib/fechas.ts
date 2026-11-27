const ZONA = "America/Guatemala";

const fecha = new Intl.DateTimeFormat("es-GT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: ZONA,
});
const fechaHora = new Intl.DateTimeFormat("es-GT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: ZONA,
});

const diaClave = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: ZONA,
});
const horaGt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  hourCycle: "h23",
  timeZone: ZONA,
});
const fechaLarga = new Intl.DateTimeFormat("es-GT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: ZONA,
});
const hora = new Intl.DateTimeFormat("es-GT", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: ZONA,
});

/**
 * Día en hora de Guatemala ("2026-11-26"). El servidor guarda en UTC (6 h adelante):
 * una venta a las 11:59 p. m. es de ese día y una a las 12:00 a. m. ya es del siguiente.
 */
export function diaDeGuatemala(fecha: string | Date): string {
  return diaClave.format(new Date(fecha));
}

/** Buenos días (5:00–11:59), buenas tardes (12:00–18:59), buenas noches (19:00–4:59). */
export function saludo(ahora = new Date()): string {
  const h = Number(horaGt.format(ahora));
  if (h >= 5 && h < 12) return "Buenos días";
  if (h >= 12 && h < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** "jueves, 26 de noviembre". */
export function formatFechaLarga(ahora = new Date()): string {
  return fechaLarga.format(ahora);
}

/** "10:45 a. m." en hora de Guatemala. */
export function formatHora(iso: string): string {
  return hora.format(new Date(iso));
}

/** "25/11/2026". Acepta ISO completo o solo fecha (AAAA-MM-DD, sin cambiar de día por la zona horaria). */
export function formatFecha(valor: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, m, d] = valor.split("-");
    return `${d}/${m}/${a}`;
  }
  return fecha.format(new Date(valor));
}

/** "25/11/2026, 10:45 a. m." en hora de Guatemala. */
export function formatFechaHora(iso: string): string {
  return fechaHora.format(new Date(iso));
}

/** "Hace 3 h", "Hace 2 días": para ver de un vistazo cuánto lleva un trámite. */
export function haceCuanto(iso: string, ahora = new Date()): string {
  const min = Math.max(0, Math.round((ahora.getTime() - new Date(iso).getTime()) / 60_000));
  if (min < 60) return min <= 1 ? "Hace un momento" : `Hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "Hace 1 día" : `Hace ${d} días`;
}
