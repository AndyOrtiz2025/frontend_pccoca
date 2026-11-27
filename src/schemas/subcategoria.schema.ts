import { z } from "zod";

const categoria = z.enum(["libreria", "tecnologia", "varios"]);
/** "  útiles   escolares " → "útiles escolares". Solo letras, números y espacios. */
const nombre = z
  .string()
  .transform((s) => s.trim().replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(2, { error: "Escribe el nombre" })
      .max(60, { error: "Máximo 60 caracteres" })
      .regex(/^[\p{L}\p{N} ]+$/u, { error: "Solo letras, números y espacios" }),
  );

/** Acciones sobre las subcategorías de Librería, Varios (Paola) o Tecnología (Oscar). */
export const subcategoriaSchema = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("crear"), categoria, nombre }),
  /** Si `a` ya existe, se unen: los productos de `de` pasan a `a`. */
  z.object({ accion: z.literal("renombrar"), categoria, de: z.string().min(1).max(60), a: nombre }),
  z.object({ accion: z.literal("eliminar"), categoria, nombre: z.string().min(1).max(60) }),
]);
export type SubcategoriaInput = z.infer<typeof subcategoriaSchema>;
