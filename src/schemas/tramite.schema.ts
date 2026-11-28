import { z } from "zod";

const dinero = (que: string) =>
  z
    .number({ error: `Escribe ${que}` })
    .gt(0, { error: `${que[0]!.toUpperCase()}${que.slice(1)} debe ser mayor a 0` })
    .max(100_000)
    .refine((n) => Math.round(n * 100) === n * 100, { error: "Máximo 2 decimales" });

/** Precio en el formulario: fijo, rango ("según vehículo") o por confirmar. */
export const precioTramiteSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("fijo"), monto: dinero("el precio") }),
  z
    .object({
      tipo: z.literal("rango"),
      monto: dinero("el precio mínimo"),
      montoMax: dinero("el precio máximo"),
    })
    .refine((p) => p.montoMax > p.monto, {
      error: "El máximo debe ser mayor al mínimo",
      path: ["montoMax"],
    }),
  z.object({ tipo: z.literal("pendiente") }),
]);

/** Nuevo / Editar trámite del catálogo. */
export const tramiteSchema = z.object({
  moduloId: z.string().min(1, { error: "Elige el módulo" }).max(60),
  nombre: z
    .string()
    .trim()
    .min(3, { error: "Escribe el nombre del trámite" })
    .max(100, { error: "Máximo 100 caracteres" }),
  requisitos: z
    .array(z.string().trim().min(1).max(120, { error: "Un requisito tiene más de 120 caracteres" }))
    .max(20, { error: "Máximo 20 requisitos" })
    .refine((rs) => new Set(rs.map((r) => r.toLowerCase())).size === rs.length, {
      error: "Hay un requisito repetido",
    }),
  precio: precioTramiteSchema,
  nota: z
    .string()
    .trim()
    .max(160, { error: "Máximo 160 caracteres" })
    .transform((v) => v || undefined)
    .optional(),
});
export type TramiteInput = z.infer<typeof tramiteSchema>;

/** Nuevo módulo / cambiar nombre. */
export const moduloTramiteSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, { error: "Escribe el nombre del módulo" })
    .max(30, { error: "Máximo 30 caracteres" }),
});

/** Editar módulo: cambiar el nombre o moverlo de lugar en las pestañas. */
export const editarModuloSchema = z.union([
  moduloTramiteSchema,
  z.object({ mover: z.enum(["izquierda", "derecha"]) }),
]);
