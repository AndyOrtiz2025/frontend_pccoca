export type NivelStock = "ok" | "bajo" | "critico";

/** Por debajo de este número de unidades el semáforo es rojo (documentación, sección 11.1). */
export const UMBRAL_CRITICO = 5;

/**
 * Semáforo de stock (documentación, sección 11.1):
 * - Rojo: menos de 5 unidades, o agotado.
 * - Verde: por encima del 50% del total registrado.
 * - Naranja: en el 50% o por debajo.
 */
export function nivelStock(disponible: number, totalRegistrado: number): NivelStock {
  if (disponible < UMBRAL_CRITICO) return "critico";
  if (totalRegistrado <= 0) return "ok";
  return disponible / totalRegistrado > 0.5 ? "ok" : "bajo";
}

/**
 * Texto del semáforo. No revela la cantidad exacta: el Empleado solo ve la banderita.
 */
export function etiquetaStock(nivel: NivelStock, disponible: number): string {
  if (nivel === "ok") return "Disponible";
  if (nivel === "bajo") return "Stock bajo";
  return disponible <= 0 ? "Agotado" : "Últimas unidades";
}
