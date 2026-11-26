import { z } from "zod";
import { MAX_PASSWORD } from "./auth.schema";

/** Contraseña asignada por Oscar: mínimo 8 caracteres, con letras y números. Máximo 72 (BCrypt). */
export const passwordNuevaSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .max(MAX_PASSWORD, `Máximo ${MAX_PASSWORD} caracteres`)
  .regex(/[A-Za-z]/, "Debe tener al menos una letra")
  .regex(/\d/, "Debe tener al menos un número");

/** Crear empleado desde "Usuarios" (Oscar). */
export const nuevoEmpleadoSchema = z
  .object({
    nombre: z.string().trim().min(2, "Escribe el nombre").max(80),
    usuario: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9._]{3,30}$/, "De 3 a 30 letras, números, punto o guion bajo, sin espacios"),
    telefono: z
      .string()
      .trim()
      .regex(/^\d{4}-?\d{4}$/, "Teléfono de 8 dígitos")
      .optional()
      .or(z.literal("")),
    password: passwordNuevaSchema,
    confirmar: z.string(),
  })
  .refine((d) => d.password === d.confirmar, {
    path: ["confirmar"],
    message: "Las contraseñas no coinciden",
  });
export type NuevoEmpleadoInput = z.infer<typeof nuevoEmpleadoSchema>;

/** Cambiar la contraseña de un empleado (Oscar). */
export const cambiarPasswordEmpleadoSchema = z
  .object({ password: passwordNuevaSchema, confirmar: z.string() })
  .refine((d) => d.password === d.confirmar, {
    path: ["confirmar"],
    message: "Las contraseñas no coinciden",
  });
