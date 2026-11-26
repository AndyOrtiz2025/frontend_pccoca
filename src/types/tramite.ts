/** Módulo del catálogo de trámites (SAT, CGC, RENAP, Otros… Paola puede crear más). */
export interface ModuloTramite {
  id: string;
  nombre: string;
  orden: number;
}

/**
 * Precio de un trámite o servicio. Algunos tienen rango ("según vehículo") o nota
 * ("Q 35.00 si es solo ratificación"). `monto: null` significa "Pendiente".
 */
export interface Precio {
  monto: number | null;
  montoMax?: number;
  nota?: string;
}

export interface Tramite {
  id: string;
  moduloId: string;
  nombre: string;
  requisitos: string[];
  precio: Precio;
}
