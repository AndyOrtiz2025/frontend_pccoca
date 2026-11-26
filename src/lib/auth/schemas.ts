import { z } from "zod";
import { ROLES } from "./roles";

/** BCrypt solo usa los primeros 72 bytes; limitamos la contraseña (guía, sección Backend). */
export const MAX_PASSWORD = 72;

export const loginSchema = z.object({
  perfil: z.enum(ROLES),
  usuario: z.string().trim().min(1, "Escribe tu usuario").max(50, "Máximo 50 caracteres"),
  password: z
    .string()
    .min(1, "Escribe tu contraseña")
    .max(MAX_PASSWORD, `Máximo ${MAX_PASSWORD} caracteres`),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const recuperarSchema = z.object({
  correo: z.email("Escribe un correo válido").max(120),
});
export type RecuperarInput = z.infer<typeof recuperarSchema>;
