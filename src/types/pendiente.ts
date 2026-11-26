/** Pestañas del Excel actual: organizaciones (escuelas, comités) y clientes individuales (sección 16). */
export type GrupoPendiente = "organizacion" | "individual";

/**
 * Fiado o préstamo (sección 8.8). Mismas columnas que el Excel:
 * Fecha · Cliente · Descripción · Cantidad · Precio unitario · Total.
 * Cuando el cliente paga, el registro se elimina (no se guarda historial).
 */
export interface Pendiente {
  id: string;
  fecha: string;
  cliente: string;
  grupo: GrupoPendiente;
  productoId?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  registradoPor: string;
}
