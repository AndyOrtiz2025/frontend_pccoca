import { z } from "zod";

const cantidad = z
  .number({ error: "Escribe la cantidad" })
  .int({ error: "La cantidad debe ser entera" })
  .min(1, { error: "La cantidad debe ser mayor a 0" })
  .max(10_000);
const linea = {
  productoId: z.string().min(1).max(60),
  presentacion: z.enum(["unidad", "paquete"]),
  cantidad,
};

/** Devolución de un cliente: lo que devuelve y lo que se lleva a cambio. */
export const devolucionSchema = z
  .object({
    /** Venta original (si trajo comprobante). */
    comprobanteId: z.string().min(1).max(60).optional(),
    /** Sin comprobante: cuándo dice que lo compró. */
    fechaCompra: z.iso.date({ error: "Fecha no válida" }).optional(),
    devuelto: z
      .array(
        z.object({
          ...linea,
          estado: z.enum(["buen_estado", "defectuoso"], { error: "Marca cómo viene" }),
          nota: z
            .string()
            .trim()
            .max(120, { error: "Máximo 120 caracteres" })
            .transform((v) => v || undefined)
            .optional(),
        }),
      )
      .min(1, { error: "Elige lo que devuelve" })
      .max(50),
    llevo: z
      .array(z.object(linea))
      .min(1, { error: "Agrega lo que se lleva: el saldo no se devuelve en dinero" })
      .max(50),
    autorizo: z
      .object({
        por: z.enum(["Paola", "Oscar"], { error: "Elige quién autorizó" }),
        motivo: z
          .string()
          .trim()
          .min(3, { error: "Escribe por qué se autorizó" })
          .max(150, { error: "Máximo 150 caracteres" }),
      })
      .optional(),
  })
  .refine((d) => d.comprobanteId || d.fechaCompra, {
    error: "Escribe cuándo lo compró",
    path: ["fechaCompra"],
  });
export type DevolucionInput = z.infer<typeof devolucionSchema>;
