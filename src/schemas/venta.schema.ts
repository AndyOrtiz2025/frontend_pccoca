import { z } from "zod";

/** Lo que manda el navegador al confirmar: qué y cuánto. NUNCA precios (los calcula el servidor). */
export const lineaCarritoSchema = z.object({
  productoId: z.string().min(1).max(50),
  tipo: z.enum(["venta", "consumo_interno", "merma"]),
  presentacion: z.enum(["unidad", "paquete"]),
  cantidad: z.number().int("La cantidad debe ser entera").positive().max(10_000),
  motivo: z.string().trim().max(200).optional(),
});

export const ventaSchema = z.object({
  lineas: z.array(lineaCarritoSchema).min(1, "El carrito está vacío").max(100),
});
export type VentaInput = z.infer<typeof ventaSchema>;
