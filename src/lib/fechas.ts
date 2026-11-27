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
