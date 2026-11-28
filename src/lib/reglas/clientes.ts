import { normalizar } from "./busqueda";

/** Límites de texto de la ficha del cliente. */
export const LIMITES_CLIENTE = {
  nombre: 80,
  nombreDato: 40,
  valorDato: 120,
  servicio: 60,
  usuario: 80,
  contrasena: 24,
  nota: 500,
} as const;

/** Máximo de archivos guardados por cliente. */
export const MAX_ARCHIVOS_CLIENTE = 20;

/** Sugerencias para los nombres de datos; se suman los que Paola ya usó. */
export const DATOS_SUGERIDOS = [
  "DPI",
  "NIT",
  "Teléfono",
  "Correo",
  "Dirección",
  "Fecha de nacimiento",
];

/** Sugerencias para "¿A qué es la contraseña?"; se suman las que Paola ya usó. */
export const SERVICIOS_SUGERIDOS = ["Agencia Virtual SAT", "Correo Gmail", "RENAP", "IGSS"];

export type TipoDato = "dpi" | "telefono" | "nit" | "correo" | "texto";

/** Qué validación lleva un dato según cómo lo nombró Paola ("Teléfono", "celular", "DPI"…). */
export function tipoDeDato(nombre: string): TipoDato {
  const n = normalizar(nombre).replace(/[^a-z ]/g, "");
  if (n === "dpi" || n === "cui" || n.startsWith("dpi ")) return "dpi";
  if (/^(telefono|tel|celular|cel|whatsapp)\b/.test(n)) return "telefono";
  if (n === "nit" || n.startsWith("nit ")) return "nit";
  if (/^(correo|email|e mail)\b/.test(n)) return "correo";
  return "texto";
}

/** "1588256841306" → "1588 25684 1306". Ignora lo que no sea número y corta en 13 dígitos. */
export function formatearDpi(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 13);
  return [d.slice(0, 4), d.slice(4, 9), d.slice(9)].filter(Boolean).join(" ");
}

/** "54128890" → "5412-8890". */
export function formatearTelefono(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 8);
  return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d;
}

/** Cómo se escribe el valor mientras Paola teclea (el DPI y el teléfono se arman solos). */
export function formatearMientrasEscribe(nombre: string, valor: string): string {
  const tipo = tipoDeDato(nombre);
  if (tipo === "dpi") return formatearDpi(valor);
  if (tipo === "telefono") return formatearTelefono(valor);
  if (tipo === "nit") return valor.toUpperCase().replace(/[^0-9K-]/g, "");
  return valor;
}

/** Largo máximo del campo de valor según el tipo de dato. */
export function largoMaximo(nombre: string): number {
  const tipo = tipoDeDato(nombre);
  if (tipo === "dpi") return 15;
  if (tipo === "telefono") return 9;
  if (tipo === "nit") return 15;
  return LIMITES_CLIENTE.valorDato;
}

export type ResultadoDato = { ok: true; valor: string } | { ok: false; error: string };

/** Revisa y deja con formato el valor de un dato según su tipo. */
export function validarDato(nombre: string, valor: string): ResultadoDato {
  const v = valor.trim();
  if (!v) return { ok: false, error: "Escribe el valor" };
  switch (tipoDeDato(nombre)) {
    case "dpi": {
      if (!/^\d{4} ?\d{5} ?\d{4}$/.test(v))
        return { ok: false, error: "El DPI lleva 13 números (ej. 1588 25684 1306)" };
      return { ok: true, valor: formatearDpi(v) };
    }
    case "telefono": {
      if (!/^\d{4}[- ]?\d{4}$/.test(v))
        return { ok: false, error: "El teléfono lleva 8 números (ej. 5412-8890)" };
      return { ok: true, valor: formatearTelefono(v) };
    }
    case "nit": {
      const nit = v.toUpperCase();
      if (!/^(\d{1,12}-?[\dK]|CF)$/.test(nit))
        return { ok: false, error: "NIT no válido (ej. 4492019-2)" };
      return { ok: true, valor: nit };
    }
    case "correo": {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || v.length > LIMITES_CLIENTE.valorDato)
        return { ok: false, error: "Correo no válido" };
      return { ok: true, valor: v.toLowerCase() };
    }
    default:
      if (v.length > LIMITES_CLIENTE.valorDato)
        return { ok: false, error: `Máximo ${LIMITES_CLIENTE.valorDato} caracteres` };
      return { ok: true, valor: v };
  }
}

/** Sugerencias sin repetir: las de siempre primero y luego las que ya se usaron. */
export function sugerencias(base: string[], usadas: string[]): string[] {
  const vistas = new Set<string>();
  const salida: string[] = [];
  for (const s of [...base, ...usadas]) {
    const clave = normalizar(s);
    if (!clave || vistas.has(clave)) continue;
    vistas.add(clave);
    salida.push(s.trim());
  }
  return salida;
}

/**
 * ¿El cliente coincide con lo que se busca? Busca en el nombre y en todos sus datos; los números
 * se comparan sin espacios ni guiones, así "1588256841306" encuentra "1588 25684 1306".
 */
export function coincideCliente(
  cliente: { nombre: string; datos: { valor: string }[] },
  consulta: string,
): boolean {
  const q = normalizar(consulta);
  if (!q) return true;
  const texto = normalizar([cliente.nombre, ...cliente.datos.map((d) => d.valor)].join(" "));
  if (texto.includes(q)) return true;
  const soloNumeros = q.replace(/[\s-]/g, "");
  return /^\d{3,}$/.test(soloNumeros) && texto.replace(/[\s-]/g, "").includes(soloNumeros);
}
