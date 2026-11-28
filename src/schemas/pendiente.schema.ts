import { z } from "zod";

const telefono = z
  .string()
  .trim()
  .regex(/^\d{4}-?\d{4}$/, "Teléfono de 8 dígitos (ej. 5412-8890)")
  .optional()
  .or(z.literal(""));

/** Nuevo cliente u organización (o editar sus datos). */
export const cuentaSchema = z.object({
  nombre: z.string().trim().min(2, "Escribe el nombre").max(100),
  grupo: z.enum(["organizacion", "individual"], {
    error: "Elige si es organización o cliente individual",
  }),
  telefono,
  notas: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
});
export type CuentaInput = z.infer<typeof cuentaSchema>;

const comunCargo = {
  cantidad: z
    .number({ error: "Escribe la cantidad" })
    .int("La cantidad debe ser entera")
    .positive("La cantidad debe ser mayor a 0")
    .max(10_000),
  llevadoPor: z.string().trim().max(100).optional(),
  nota: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
};

/**
 * Agregar un cargo a la cuenta (sección 8.8). Dos formas:
 * - producto: del catálogo; el precio lo pone el servidor (con mayoreo) y se descuenta del stock.
 * - libre: algo que no es un producto (ej. "Impresiones a color"); descripción y precio a mano.
 */
export const cargoSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("producto"),
    ...comunCargo,
    productoId: z.string().min(1, "Elige el producto"),
  }),
  z.object({
    tipo: z.literal("libre"),
    ...comunCargo,
    descripcion: z.string().trim().min(2, "Describe qué se llevó").max(150),
    precioUnitario: z
      .number({ error: "Escribe el precio" })
      .positive("El precio debe ser mayor a 0")
      .max(100_000),
  }),
]);
export type CargoInput = z.infer<typeof cargoSchema>;

/** "Dejo un abono": monto libre que baja el saldo. */
export const abonoSchema = z.object({
  monto: z
    .number({ error: "Escribe el monto" })
    .positive("El monto debe ser mayor a Q 0.00")
    .max(100_000),
  nota: z.string().trim().max(200).optional(),
});

/** "Vamos a pagar esto": cargos seleccionados. */
export const pagarCargosSchema = z.object({
  cargoIds: z.array(z.string().min(1)).min(1, "Selecciona al menos un cargo").max(200),
  nota: z.string().trim().max(200).optional(),
});

/**
 * Corregir un cargo que todavía no se pagó. El producto no cambia (para eso se agrega otro):
 * - producto: cantidad (el stock se ajusta), quién se lo llevó y nota.
 * - libre: también la descripción y el precio.
 */
export const editarCargoSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("producto"), ...comunCargo }),
  z.object({
    tipo: z.literal("libre"),
    ...comunCargo,
    descripcion: z.string().trim().min(2, "Describe qué se llevó").max(150),
    precioUnitario: z
      .number({ error: "Escribe el precio" })
      .positive("El precio debe ser mayor a 0")
      .max(100_000),
  }),
]);
export type EditarCargoInput = z.infer<typeof editarCargoSchema>;
