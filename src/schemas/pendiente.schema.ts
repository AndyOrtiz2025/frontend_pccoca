import { z } from "zod";

const comun = {
  cliente: z.string().trim().min(2, "Escribe el nombre del cliente").max(100),
  grupo: z.enum(["organizacion", "individual"], {
    error: "Elige si es organización o cliente individual",
  }),
  cantidad: z
    .number({ error: "Escribe la cantidad" })
    .int("La cantidad debe ser entera")
    .positive("La cantidad debe ser mayor a 0")
    .max(10_000),
};

/**
 * "Nuevo pendiente" (sección 8.8). Dos formas:
 * - producto: del catálogo; el precio lo pone el servidor (con mayoreo) y se descuenta del stock.
 * - libre: algo que no es un producto (ej. "Impresiones a color"); descripción y precio a mano.
 */
export const pendienteSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("producto"),
    ...comun,
    productoId: z.string().min(1, "Elige el producto"),
  }),
  z.object({
    tipo: z.literal("libre"),
    ...comun,
    descripcion: z.string().trim().min(2, "Describe qué se llevó").max(150),
    precioUnitario: z
      .number({ error: "Escribe el precio" })
      .positive("El precio debe ser mayor a 0")
      .max(100_000),
  }),
]);
export type PendienteInput = z.infer<typeof pendienteSchema>;
