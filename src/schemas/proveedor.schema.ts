import { z } from "zod";

/** Texto opcional: si viene vacío queda sin valor. */
const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Máximo ${max} caracteres` })
    .transform((v) => v || undefined)
    .optional();

/** Nuevo / Editar proveedor. */
export const proveedorSchema = z.object({
  nombre: z.string().trim().min(2, { error: "Escribe el nombre" }).max(80),
  nit: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^(\d{1,12}-?[\dK]|CF)$/, { error: "NIT no válido (ej. 4492019-2)" })
    .optional()
    .or(z.literal("").transform(() => undefined)),
  contacto: opcional(80),
  telefono: z
    .string()
    .trim()
    .regex(/^\d{4}-?\d{4}$/, { error: "Teléfono de 8 dígitos" })
    .optional()
    .or(z.literal("").transform(() => undefined)),
  correo: z
    .email({ error: "Correo no válido" })
    .max(120)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  direccion: opcional(160),
  diasVisita: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  surte: z
    .array(z.enum(["libreria", "tecnologia", "varios"]))
    .min(1, { error: "Elige qué surte" })
    .max(3),
  notas: opcional(300),
});
export type ProveedorInput = z.infer<typeof proveedorSchema>;

const dinero = z
  .number({ error: "Escribe el costo" })
  .min(0, { error: "El costo no puede ser negativo" })
  .max(100_000)
  .refine((n) => Math.round(n * 100) === n * 100, { error: "Máximo 2 decimales" });
const entero = z.number({ error: "Escribe la cantidad" }).int().min(0).max(100_000);

/** Registrar compra: el costo lo pone Paola (es lo que pagó); el stock lo suma el servidor. */
export const compraSchema = z.object({
  proveedorId: z.string().min(1, { error: "Elige el proveedor" }).max(60),
  /** Día de recepción (AAAA-MM-DD); la hora la pone el servidor. */
  fecha: z.iso.date({ error: "Fecha no válida" }),
  factura: opcional(40),
  lineas: z
    .array(
      z
        .object({
          productoId: z.string().min(1).max(60),
          presentacion: z.enum(["unidad", "paquete"]),
          cantidad: entero,
          danadas: entero,
          costoUnitario: dinero,
          motivoDano: opcional(120),
        })
        .refine((l) => l.cantidad + l.danadas > 0, {
          error: "Escribe cuántas llegaron",
          path: ["cantidad"],
        }),
    )
    .min(1, { error: "Agrega al menos un producto" })
    .max(100),
});
export type CompraInput = z.infer<typeof compraSchema>;

/** Resolver un reclamo al proveedor. */
export const resolverReclamoSchema = z.object({
  estado: z.enum(["repuesto", "reembolsado", "perdida"]),
  /** Reembolso: cuánto devolvió (por defecto, lo que costó). */
  monto: dinero.optional(),
  nota: opcional(200),
});
export type ResolverReclamoInput = z.infer<typeof resolverReclamoSchema>;
