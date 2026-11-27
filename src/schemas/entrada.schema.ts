import { z } from "zod";
import { TIPOS_EQUIPO } from "@/types/servicio";

const cliente = z.object({
  nombre: z.string().trim().min(2, "Escribe el nombre del cliente").max(100),
  telefono: z
    .string()
    .trim()
    .regex(/^\d{4}-?\d{4}$/, "Teléfono de 8 dígitos (ej. 5412-8890)")
    .optional()
    .or(z.literal("")),
});

/** Pago del trámite: cancelado, no cancelado, o anticipo con su monto. */
export const pagoSchema = z
  .object({
    estado: z.enum(["cancelado", "pendiente", "anticipo"], { error: "Indica si el cliente pagó" }),
    anticipo: z
      .number({ error: "Escribe el monto del anticipo" })
      .positive("El anticipo debe ser mayor a Q 0.00")
      .max(100_000)
      .optional(),
  })
  .superRefine((p, ctx) => {
    if (p.estado === "anticipo" && p.anticipo === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["anticipo"],
        message: "Escribe el monto del anticipo",
      });
    }
  })
  // El monto solo se guarda si es anticipo.
  .transform((p) => (p.estado === "anticipo" ? p : { estado: p.estado }));

/** "Enviar entrada de trámite" (pantalla 9): se notifica a Paola. */
export const entradaTramiteSchema = z.object({
  cliente,
  tramiteId: z.string().min(1, "Elige el tipo de trámite"),
  documentos: z.array(z.object({ nombre: z.string(), entregado: z.boolean() })),
  pago: pagoSchema,
  datosCliente: z.string().trim().max(1000, "Máximo 1000 caracteres").optional(),
  notas: z.string().trim().max(500).optional(),
});
export type EntradaTramiteInput = z.infer<typeof entradaTramiteSchema>;

/** "Enviar entrada de servicio técnico" (variante de la pantalla 9): se notifica a Oscar. */
export const entradaServicioSchema = z.object({
  cliente,
  /** Solo ids: el nombre y el precio los pone el servidor desde el catálogo. */
  servicioId: z.string().trim().max(60).optional(),
  opcionId: z.string().trim().max(60).optional(),
  equipo: z.enum(TIPOS_EQUIPO, { error: "Elige el tipo de equipo" }),
  marcaModelo: z.string().trim().max(80).optional(),
  falla: z.string().trim().min(3, "Describe la falla reportada").max(500),
  accesorios: z.array(z.string().trim().min(1)).max(10),
  notas: z.string().trim().max(500).optional(),
});
export type EntradaServicioInput = z.infer<typeof entradaServicioSchema>;
