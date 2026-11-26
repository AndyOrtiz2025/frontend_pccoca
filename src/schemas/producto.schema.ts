import { z } from "zod";

const dinero = (campo: string) =>
  z
    .number({ error: `${campo}: escribe un número` })
    .nonnegative(`${campo} no puede ser negativo`)
    .max(100_000, `${campo} es demasiado alto`)
    .refine(
      (n) =>
        Number.isInteger(Math.round(n * 100)) && Math.abs(n * 100 - Math.round(n * 100)) < 1e-6,
      {
        message: `${campo}: máximo 2 decimales`,
      },
    );

const entero = (campo: string) =>
  z
    .number({ error: `${campo}: escribe un número` })
    .int(`${campo} debe ser entero`)
    .nonnegative();

/** Código interno: LIB-0034, TEC-0012, VAR-0003. */
export const CODIGO_REGEX = /^(LIB|TEC|VAR)-\d{4}$/;
/** Código de barras: el interno o un EAN/UPC del fabricante (letras, números y guion). */
export const CODIGO_BARRAS_REGEX = /^[A-Za-z0-9-]{4,32}$/;

/**
 * Formulario "Nuevo / Editar producto" (pantalla 16).
 * Reglas: mayoreo solo en Librería y Varios, y más barato que el precio normal;
 * consumo interno nunca en Productos Varios; el prefijo del código coincide con la categoría.
 */
export const productoSchema = z
  .object({
    nombre: z.string().trim().min(2, "Escribe el nombre").max(120),
    codigo: z
      .string()
      .trim()
      .toUpperCase()
      .regex(CODIGO_REGEX, "Formato: LIB-0001, TEC-0001 o VAR-0001"),
    codigoBarras: z
      .string()
      .trim()
      .regex(CODIGO_BARRAS_REGEX, "Solo letras, números y guion (4 a 32 caracteres)")
      .optional(),
    categoria: z.enum(["libreria", "tecnologia", "varios"]),
    subcategoria: z.string().trim().max(60).optional(),
    descripcion: z.string().trim().max(500).optional(),
    precio: dinero("El precio").refine((n) => n > 0, "El precio debe ser mayor a 0"),
    costo: dinero("El costo").optional(),
    mayoreo: z
      .object({
        desde: z.number().int().min(2, "El mayoreo aplica desde 2 unidades o más"),
        precio: dinero("El precio de mayoreo"),
      })
      .optional(),
    aplicaConsumoInterno: z.boolean(),
    fraccionable: z
      .object({
        unidadesPorPaquete: z.number().int().min(2, "Un paquete debe traer al menos 2 unidades"),
        precioPaquete: dinero("El precio por paquete").refine(
          (n) => n > 0,
          "El precio por paquete debe ser mayor a 0",
        ),
        costoPaquete: dinero("El costo por paquete").optional(),
      })
      .optional(),
    stockInicial: entero("El stock inicial"),
    proveedorId: z.string().optional(),
  })
  .superRefine((p, ctx) => {
    const prefijo = { libreria: "LIB", tecnologia: "TEC", varios: "VAR" }[p.categoria];
    if (!p.codigo.startsWith(prefijo)) {
      ctx.addIssue({
        code: "custom",
        path: ["codigo"],
        message: `En esta categoría el código empieza con ${prefijo}-`,
      });
    }
    if (p.mayoreo && p.categoria === "tecnologia") {
      ctx.addIssue({
        code: "custom",
        path: ["mayoreo"],
        message: "Tecnología tiene precios fijos, sin mayoreo",
      });
    }
    if (p.mayoreo && p.mayoreo.precio >= p.precio) {
      ctx.addIssue({
        code: "custom",
        path: ["mayoreo", "precio"],
        message: "El precio de mayoreo debe ser menor al precio normal",
      });
    }
    if (p.aplicaConsumoInterno && p.categoria === "varios") {
      ctx.addIssue({
        code: "custom",
        path: ["aplicaConsumoInterno"],
        message: "Productos Varios no aplica a consumo interno",
      });
    }
  });
export type ProductoInput = z.infer<typeof productoSchema>;

/** Registrar merma desde el detalle del producto (sección 11.7): motivo obligatorio. */
export const mermaSchema = z.object({
  productoId: z.string().min(1),
  presentacion: z.enum(["unidad", "paquete"]),
  cantidad: z.number().int().positive("La cantidad debe ser mayor a 0"),
  motivo: z.string().trim().min(3, "Escribe el motivo (ej. dañado, vencido, humedad)").max(200),
});
export type MermaInput = z.infer<typeof mermaSchema>;
