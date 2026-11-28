import { describe, expect, it } from "vitest";
import { cambioEstadoSchema, cobroSchema, notaProcesoSchema } from "./proceso.schema";
import { compraSchema, proveedorSchema, resolverReclamoSchema } from "./proveedor.schema";
import { subcategoriaSchema } from "./subcategoria.schema";
import { nuevoEmpleadoSchema } from "./usuario.schema";
import { ventaSchema } from "./venta.schema";

const mensaje = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.success ? undefined : r.error!.issues[0]?.message;

describe("proceso.schema (trámites y servicios en proceso)", () => {
  it("solo mueve entre recibido, en proceso y listo", () => {
    expect(cambioEstadoSchema.safeParse({ estado: "listo" }).success).toBe(true);
    expect(mensaje(cambioEstadoSchema.safeParse({ estado: "entregado" }))).toBe("Elige un estado");
  });

  it("valida notas y cobros", () => {
    expect(mensaje(notaProcesoSchema.safeParse({ texto: " a " }))).toBe("Escribe la nota");
    expect(cobroSchema.parse({ total: "35", detalle: "Incluye copia" })).toEqual({
      total: 35,
      detalle: "Incluye copia",
    });
    expect(mensaje(cobroSchema.safeParse({ total: 0 }))).toBe("Escribe cuánto cobrar");
    expect(mensaje(cobroSchema.safeParse({ total: 10.555 }))).toBe("Máximo 2 decimales");
  });
});

describe("proveedor.schema", () => {
  const proveedor = { nombre: "Distribuidora Huehue", surte: ["libreria"] };

  it("acepta NIT, teléfono y correo, o vacíos", () => {
    const r = proveedorSchema.parse({
      ...proveedor,
      nit: "4492019-k",
      telefono: "7764-1234",
      correo: "",
      contacto: "  ",
    });
    expect(r).toMatchObject({ nit: "4492019-K", telefono: "7764-1234" });
    expect(r.correo).toBeUndefined();
    expect(r.contacto).toBeUndefined();
    expect(proveedorSchema.parse({ ...proveedor, nit: "CF" }).nit).toBe("CF");
  });

  it("rechaza datos mal escritos", () => {
    expect(mensaje(proveedorSchema.safeParse({ ...proveedor, nit: "12-34-K" }))).toContain(
      "NIT no válido",
    );
    expect(mensaje(proveedorSchema.safeParse({ ...proveedor, telefono: "123" }))).toBe(
      "Teléfono de 8 dígitos",
    );
    expect(mensaje(proveedorSchema.safeParse({ ...proveedor, correo: "abc" }))).toBe(
      "Correo no válido",
    );
    expect(mensaje(proveedorSchema.safeParse({ ...proveedor, surte: [] }))).toBe("Elige qué surte");
  });

  it("compra: cada línea trae algo y el costo con máximo 2 decimales", () => {
    const linea = {
      productoId: "p-lib-0021",
      presentacion: "unidad",
      cantidad: 0,
      danadas: 0,
      costoUnitario: 33,
    };
    const compra = { proveedorId: "prov-1", fecha: "2026-11-27", lineas: [linea] };
    expect(mensaje(compraSchema.safeParse(compra))).toBe("Escribe cuántas llegaron");
    expect(
      mensaje(
        compraSchema.safeParse({
          ...compra,
          lineas: [{ ...linea, cantidad: 1, costoUnitario: 1.234 }],
        }),
      ),
    ).toBe("Máximo 2 decimales");
    expect(mensaje(compraSchema.safeParse({ ...compra, lineas: [] }))).toBe(
      "Agrega al menos un producto",
    );
    expect(resolverReclamoSchema.safeParse({ estado: "repuesto" }).success).toBe(true);
  });
});

describe("subcategoria.schema", () => {
  it("limpia espacios y solo acepta letras, números y espacios", () => {
    expect(
      subcategoriaSchema.parse({
        accion: "crear",
        categoria: "libreria",
        nombre: "  útiles   escolares ",
      }),
    ).toMatchObject({ nombre: "útiles escolares" });
    expect(
      mensaje(
        subcategoriaSchema.safeParse({
          accion: "crear",
          categoria: "varios",
          nombre: "Fomi/Foamy",
        }),
      ),
    ).toBe("Solo letras, números y espacios");
    expect(
      subcategoriaSchema.safeParse({
        accion: "renombrar",
        categoria: "varios",
        de: "Fomi",
        a: "Foamy",
      }).success,
    ).toBe(true);
  });
});

describe("venta.schema", () => {
  it("el carrito no puede ir vacío y la cantidad es entera", () => {
    expect(mensaje(ventaSchema.safeParse({ lineas: [] }))).toBe("El carrito está vacío");
    expect(
      mensaje(
        ventaSchema.safeParse({
          lineas: [{ productoId: "p", tipo: "venta", presentacion: "unidad", cantidad: 1.5 }],
        }),
      ),
    ).toBe("La cantidad debe ser entera");
  });
});

describe("usuario.schema", () => {
  it("las contraseñas deben coincidir", () => {
    const r = nuevoEmpleadoSchema.safeParse({
      nombre: "Ana",
      usuario: "Ana.Ruiz",
      password: "clave1234",
      confirmar: "clave12345",
    });
    expect(r.success).toBe(false);
  });
});
