import { z } from "zod";

/** "Nuevo pendiente" (sección 8.8). Si viene de un producto, se descuenta del stock. */
export const pendienteSchema = z.object({
  cliente: z.string().trim().min(2, "Escribe el nombre del cliente").max(100),
  grupo: z.enum(["organizacion", "individual"]),
  productoId: z.string().optional(),
  descripcion: z.string().trim().min(2, "Describe el producto o servicio").max(150),
  cantidad: z
    .number()
    .int("La cantidad debe ser entera")
    .positive("La cantidad debe ser mayor a 0"),
  precioUnitario: z.number().positive("El precio debe ser mayor a 0").max(100_000),
});
export type PendienteInput = z.infer<typeof pendienteSchema>;
