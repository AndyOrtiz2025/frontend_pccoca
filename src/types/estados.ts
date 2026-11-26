/** Estados de trámites y servicios en proceso (documentación, sección 11.8). */
export type EstadoProceso = "recibido" | "en_proceso" | "listo" | "entregado";

export const ETIQUETA_ESTADO: Record<EstadoProceso, string> = {
  recibido: "Recibido",
  en_proceso: "En proceso",
  listo: "Listo para entregar",
  entregado: "Entregado",
};
