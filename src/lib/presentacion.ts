import type { Presentacion } from "@/types/producto";

/** Nombres de paquete más comunes en el negocio, con su plural. "Otro" permite escribir uno. */
export const NOMBRES_PAQUETE: { singular: string; plural: string }[] = [
  { singular: "Caja", plural: "Cajas" },
  { singular: "Paquete", plural: "Paquetes" },
  { singular: "Bolsa", plural: "Bolsas" },
  { singular: "Resma", plural: "Resmas" },
  { singular: "Docena", plural: "Docenas" },
  { singular: "Ciento", plural: "Cientos" },
  { singular: "Fardo", plural: "Fardos" },
  { singular: "Rollo", plural: "Rollos" },
  { singular: "Block", plural: "Blocks" },
  { singular: "Bote", plural: "Botes" },
  { singular: "Tubo", plural: "Tubos" },
  { singular: "Sobre", plural: "Sobres" },
  { singular: "Estuche", plural: "Estuches" },
  { singular: "Blíster", plural: "Blísteres" },
  { singular: "Display", plural: "Displays" },
  { singular: "Set", plural: "Sets" },
];

/** "Caja" para un producto en cajas; "Paquete" si no tiene nombre. */
export function nombrePaquete(p: { fraccionable?: { nombrePaquete?: string } }): string {
  return p.fraccionable?.nombrePaquete?.trim() || "Paquete";
}

/** Plural de un nombre de paquete: conocidos de la lista, o la regla del español. */
export function pluralPaquete(singular: string): string {
  const conocido = NOMBRES_PAQUETE.find((n) => n.singular.toLowerCase() === singular.toLowerCase());
  if (conocido) return conocido.plural;
  if (/[aeiouáéó]$/i.test(singular)) return `${singular}s`;
  if (/z$/i.test(singular)) return `${singular.slice(0, -1)}ces`;
  // Cartón → Cartones: la tilde de la última sílaba se pierde al agregar "es".
  const sinTilde = singular.replace(/[áéíóú](?=[ns]$)/i, (v) => v.normalize("NFD")[0]!);
  return `${sinTilde}es`;
}

/** "3 cajas", "1 caja", "5 unidades". En minúscula para usar dentro de una frase. */
export function cantidadCon(
  p: { fraccionable?: { nombrePaquete?: string } },
  presentacion: Presentacion,
  cantidad: number,
): string {
  if (presentacion === "unidad") return `${cantidad} ${cantidad === 1 ? "unidad" : "unidades"}`;
  const s = nombrePaquete(p);
  return `${cantidad} ${(cantidad === 1 ? s : pluralPaquete(s)).toLowerCase()}`;
}

/** "Por unidad" / "Por caja". */
export function etiquetaPresentacion(
  p: { fraccionable?: { nombrePaquete?: string } },
  presentacion: Presentacion,
): string {
  return presentacion === "unidad" ? "Por unidad" : `Por ${nombrePaquete(p).toLowerCase()}`;
}
