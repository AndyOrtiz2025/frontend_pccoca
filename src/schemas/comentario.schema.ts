import { z } from "zod";

/** Comentario del Empleado para Paola u Oscar (documentación, sección 8.6). */
export const comentarioSchema = z.object({
  para: z.enum(["paola", "oscar"], { error: "Elige para quién es el comentario" }),
  mensaje: z.string().trim().min(3, "Escribe el comentario").max(500, "Máximo 500 caracteres"),
});
export type ComentarioInput = z.infer<typeof comentarioSchema>;
