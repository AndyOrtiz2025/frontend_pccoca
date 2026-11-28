import { z } from "zod";

const cantidad = z
  .number({ error: "Escribe la cantidad" })
  .int({ error: "La cantidad debe ser entera" })
  .min(1, { error: "La cantidad debe ser mayor a 0" })
  .max(100_000);
const entero = z.number({ error: "Escribe la cantidad" }).int().min(0).max(100_000);
const dinero = z
  .number({ error: "Escribe el costo" })
  .min(0, { error: "El costo no puede ser negativo" })
  .max(100_000)
  .refine((n) => Math.round(n * 100) === n * 100, { error: "Máximo 2 decimales" });
const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Máximo ${max} caracteres` })
    .transform((v) => v || undefined)
    .optional();

/** Una línea del pedido: un producto que ya tenemos, o el nombre de uno que no tenemos. */
const lineaPedido = z
  .object({
    productoId: z.string().min(1).max(60).optional(),
    nombre: opcional(80),
    presentacion: z.enum(["unidad", "paquete"]),
    cantidad,
    /** Lo que falta de un pedido anterior y se pasa a este. */
    traerDe: z.object({ pedidoId: z.string().max(60), lineaId: z.string().max(60) }).optional(),
  })
  .refine((l) => l.productoId || l.nombre, {
    error: "Escribe el nombre del producto",
    path: ["nombre"],
  });

/** Nuevo / Editar pedido. */
export const pedidoSchema = z.object({
  proveedorId: z.string().min(1, { error: "Elige el proveedor" }).max(60),
  notas: opcional(300),
  lineas: z
    .array(lineaPedido)
    .min(1, { error: "Agrega al menos un producto" })
    .max(150, { error: "Máximo 150 productos por pedido" }),
});
export type PedidoInput = z.infer<typeof pedidoSchema>;

/**
 * Revisar paquete: lo que vino de cada línea. Las líneas que no se mandan siguen pendientes;
 * las de `cancelar` ya no se piden.
 */
export const recibirPedidoSchema = z
  .object({
    fecha: z.iso.date({ error: "Fecha no válida" }),
    factura: opcional(40),
    lineas: z
      .array(
        z
          .object({
            lineaId: z.string().min(1).max(60),
            /** Producto nuevo: el que se acaba de crear al llegar. */
            productoId: z.string().min(1).max(60).optional(),
            presentacion: z.enum(["unidad", "paquete"]),
            buenas: entero,
            danadas: entero,
            costoUnitario: dinero,
            motivoDano: opcional(120),
            /** Vino menos de lo pedido y ya no se espera el resto. */
            noEsperarResto: z.boolean().default(false),
          })
          .refine((l) => l.buenas + l.danadas > 0, {
            error: "Escribe cuántas vinieron",
            path: ["buenas"],
          }),
      )
      .max(150)
      .default([]),
    cancelar: z.array(z.string().min(1).max(60)).max(150).default([]),
  })
  .refine((d) => d.lineas.length + d.cancelar.length > 0, {
    error: "Marca lo que vino o lo que ya no se pide",
    path: ["lineas"],
  });
export type RecibirPedidoInput = z.infer<typeof recibirPedidoSchema>;

/** Nuevo precio desde el aviso de "cambió el costo". */
export const nuevoPrecioSchema = z.object({
  presentacion: z.enum(["unidad", "paquete"]),
  precio: z
    .number({ error: "Escribe el precio" })
    .gt(0, { error: "El precio debe ser mayor a 0" })
    .max(100_000)
    .refine((n) => Math.round(n * 100) === n * 100, { error: "Máximo 2 decimales" }),
});
export type NuevoPrecioInput = z.infer<typeof nuevoPrecioSchema>;
