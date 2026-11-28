import { z } from "zod";
import { LIMITES_CLIENTE as L, validarDato } from "@/lib/reglas/clientes";

const texto = (max: number, vacio: string) =>
  z
    .string({ error: vacio })
    .trim()
    .min(1, { error: vacio })
    .max(max, { error: `Máximo ${max} caracteres` });

const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Máximo ${max} caracteres` })
    .transform((v) => v || undefined)
    .optional();

/** Nuevo cliente o cambiarle el nombre: solo se pide el nombre. */
export const clienteSchema = z.object({
  nombre: z
    .string({ error: "Escribe el nombre" })
    .trim()
    .min(2, { error: "Escribe el nombre" })
    .max(L.nombre, { error: `Máximo ${L.nombre} caracteres` }),
});
export type ClienteInput = z.infer<typeof clienteSchema>;

/** Dato libre ("DPI: 1588 25684 1306"). El valor se revisa según el nombre del dato. */
export const datoClienteSchema = z
  .object({
    nombre: texto(L.nombreDato, "Escribe qué dato es"),
    valor: z.string({ error: "Escribe el valor" }),
  })
  .transform((d, ctx) => {
    const r = validarDato(d.nombre, d.valor);
    if (!r.ok) {
      ctx.addIssue({ code: "custom", message: r.error, path: ["valor"] });
      return z.NEVER;
    }
    return { nombre: d.nombre, valor: r.valor };
  });
export type DatoClienteInput = z.infer<typeof datoClienteSchema>;

const contrasena = z
  .string({ error: "Escribe la contraseña" })
  .min(1, { error: "Escribe la contraseña" })
  .max(L.contrasena, { error: `Máximo ${L.contrasena} caracteres` })
  .refine((v) => v.trim().length > 0, { error: "Escribe la contraseña" });

/** Nueva contraseña del cliente. */
export const contrasenaClienteSchema = z.object({
  servicio: texto(L.servicio, "Escribe a qué es la contraseña"),
  usuario: opcional(L.usuario),
  contrasena,
  nota: opcional(200),
});
export type ContrasenaClienteInput = z.infer<typeof contrasenaClienteSchema>;

/** Editar una contraseña: si no se escribe una nueva, se queda la que estaba. */
export const editarContrasenaSchema = contrasenaClienteSchema.extend({
  contrasena: contrasena.optional().or(z.literal("").transform(() => undefined)),
});
export type EditarContrasenaInput = z.infer<typeof editarContrasenaSchema>;

export const notaClienteSchema = z.object({
  texto: texto(L.nota, "Escribe la nota"),
});

export const activoClienteSchema = z.object({ activo: z.boolean() });
