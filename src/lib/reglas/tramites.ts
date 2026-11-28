import type { TramiteInput } from "@/schemas/tramite.schema";
import type { Precio, Tramite } from "@/types/tramite";
import { normalizar } from "./busqueda";
import { centavos } from "./dinero";

/** Del formulario al precio que se guarda (monto null = "Por confirmar"). */
export function precioDesdeFormulario(datos: Pick<TramiteInput, "precio" | "nota">): Precio {
  const p = datos.precio;
  const base: Precio =
    p.tipo === "pendiente"
      ? { monto: null }
      : p.tipo === "rango"
        ? { monto: centavos(p.monto), montoMax: centavos(p.montoMax) }
        : { monto: centavos(p.monto) };
  return datos.nota ? { ...base, nota: datos.nota } : base;
}

/** ¿Cambió el precio? (la nota también cuenta: "Q 35 si es solo ratificación"). */
export function mismoPrecio(a: Precio, b: Precio): boolean {
  return a.monto === b.monto && a.montoMax === b.montoMax && (a.nota ?? "") === (b.nota ?? "");
}

/**
 * Requisitos que ya se usan en el catálogo, del más usado al menos usado
 * ("DPI escaneado (ambos lados)", "Recibo de luz (NIS)"…), para no escribirlos cada vez.
 */
export function requisitosFrecuentes(tramites: Pick<Tramite, "requisitos">[]): string[] {
  const cuenta = new Map<string, { texto: string; n: number }>();
  for (const r of tramites.flatMap((t) => t.requisitos)) {
    const k = normalizar(r);
    const actual = cuenta.get(k);
    cuenta.set(k, { texto: actual?.texto ?? r, n: (actual?.n ?? 0) + 1 });
  }
  return [...cuenta.values()]
    .sort((a, b) => b.n - a.n || a.texto.localeCompare(b.texto, "es"))
    .map((x) => x.texto);
}

/** id corto y legible para un módulo nuevo: "MINTRAB" → "mintrab". */
export function idModulo(nombre: string, existentes: string[]): string {
  const base =
    normalizar(nombre)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "modulo";
  let id = base;
  for (let i = 2; existentes.includes(id); i++) id = `${base}-${i}`;
  return id;
}
