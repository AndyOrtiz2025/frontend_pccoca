import { z } from "zod";

/** Paola y Oscar solo mueven entre estos tres; "Entregado" lo marca el mostrador. */
export const cambioEstadoSchema = z.object({
  estado: z.enum(["recibido", "en_proceso", "listo"], { error: "Elige un estado" }),
});

export const notaProcesoSchema = z.object({
  texto: z
    .string()
    .trim()
    .min(2, { error: "Escribe la nota" })
    .max(300, { error: "Máximo 300 caracteres" }),
});

export const cobroSchema = z.object({
  total: z.coerce
    .number({ error: "Escribe cuánto cobrar" })
    .positive({ error: "Escribe cuánto cobrar" })
    .max(100_000, { error: "Revisa el monto" })
    .refine((n) => Math.round(n * 100) === n * 100, { error: "Máximo 2 decimales" }),
  detalle: z.string().trim().max(80, { error: "Máximo 80 caracteres" }).optional(),
});

export type CobroInput = z.infer<typeof cobroSchema>;
