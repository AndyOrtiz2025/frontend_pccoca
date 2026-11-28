import { PLAZO_DEVOLUCION_DIAS, type Devolucion } from "@/types/devolucion";
import { centavos } from "./dinero";

/** Días de calendario entre dos días "AAAA-MM-DD" (hoy − compra). */
export function diasEntre(desde: string, hasta: string): number {
  const ms = Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Pasado el plazo (más de 3 días) necesita la autorización de Paola u Oscar. */
export const fueraDePlazo = (dias: number) => dias > PLAZO_DEVOLUCION_DIAS;

/**
 * Cómo va el cambio: lo que falta escoger para usar todo el saldo, o lo que el cliente paga
 * de más. Solo se puede cerrar cuando `falta` es 0.
 */
export function cuadreCambio(saldo: number, totalLlevo: number) {
  const d = centavos(totalLlevo - saldo);
  return { falta: d < 0 ? -d : 0, diferencia: d > 0 ? d : 0 };
}

/** "D-3F2A9C": número corto de la devolución. */
export function numeroDevolucion(d: Pick<Devolucion, "id">): string {
  return `D-${d.id
    .replace(/^D-/, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 6)
    .toUpperCase()}`;
}
