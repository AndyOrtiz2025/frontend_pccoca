import { describe, expect, it } from "vitest";
import { entradaServicioSchema, entradaTramiteSchema, pagoSchema } from "./entrada.schema";
import { pendienteSchema } from "./pendiente.schema";
import { mermaSchema, productoSchema, type ProductoInput } from "./producto.schema";
import { nuevoEmpleadoSchema } from "./usuario.schema";

const base: ProductoInput = {
  nombre: "Folder tamaño carta",
  codigo: "LIB-0034",
  categoria: "libreria",
  precio: 2,
  costo: 1.1,
  mayoreo: { desde: 10, precio: 1.5 },
  aplicaConsumoInterno: false,
  stockInicial: 100,
};
const errores = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.success ? [] : r.error!.issues.map((i) => i.message);

describe("productoSchema (pantalla 16)", () => {
  it("acepta un producto válido y pone el código en mayúsculas", () => {
    const r = productoSchema.safeParse({ ...base, codigo: "lib-0034" });
    expect(r.success && r.data.codigo).toBe("LIB-0034");
  });

  it("el prefijo del código debe coincidir con la categoría", () => {
    expect(errores(productoSchema.safeParse({ ...base, codigo: "TEC-0034" }))).toContain(
      "En esta categoría el código empieza con LIB-",
    );
  });

  it("Tecnología no admite mayoreo", () => {
    const r = productoSchema.safeParse({ ...base, categoria: "tecnologia", codigo: "TEC-0001" });
    expect(errores(r)).toContain("Tecnología tiene precios fijos, sin mayoreo");
  });

  it("el mayoreo debe ser más barato", () => {
    expect(
      errores(productoSchema.safeParse({ ...base, mayoreo: { desde: 10, precio: 2 } })),
    ).toContain("El precio de mayoreo debe ser menor al precio normal");
  });

  it("Productos Varios no aplica a consumo interno", () => {
    const r = productoSchema.safeParse({
      ...base,
      categoria: "varios",
      codigo: "VAR-0001",
      aplicaConsumoInterno: true,
    });
    expect(errores(r)).toContain("Productos Varios no aplica a consumo interno");
  });

  it("precios con más de 2 decimales o negativos no pasan", () => {
    expect(productoSchema.safeParse({ ...base, precio: 2.555 }).success).toBe(false);
    expect(productoSchema.safeParse({ ...base, costo: -1 }).success).toBe(false);
  });

  it("valida el código de barras", () => {
    expect(productoSchema.safeParse({ ...base, codigoBarras: "7401234500501" }).success).toBe(true);
    expect(productoSchema.safeParse({ ...base, codigoBarras: "con espacios" }).success).toBe(false);
  });
});

describe("mermaSchema", () => {
  it("exige motivo", () => {
    expect(
      mermaSchema.safeParse({ productoId: "x", presentacion: "unidad", cantidad: 1, motivo: "" })
        .success,
    ).toBe(false);
  });
});

describe("entradas", () => {
  it("trámite: cliente y tipo de trámite obligatorios, teléfono opcional", () => {
    expect(
      entradaTramiteSchema.safeParse({
        cliente: { nombre: "Ana", telefono: "" },
        tramiteId: "sat-nit",
        documentos: [],
        pago: { estado: "pendiente" },
      }).success,
    ).toBe(true);
    expect(
      entradaTramiteSchema.safeParse({
        cliente: { nombre: "Ana", telefono: "123" },
        tramiteId: "sat-nit",
        documentos: [],
        pago: { estado: "pendiente" },
      }).success,
    ).toBe(false);
  });

  it("servicio: exige equipo válido y falla", () => {
    expect(
      entradaServicioSchema.safeParse({
        cliente: { nombre: "Juan" },
        equipo: "Laptop",
        falla: "No enciende",
        accesorios: [],
      }).success,
    ).toBe(true);
    expect(
      entradaServicioSchema.safeParse({
        cliente: { nombre: "Juan" },
        equipo: "Tostadora",
        falla: "x",
        accesorios: [],
      }).success,
    ).toBe(false);
  });
});

describe("pagoSchema", () => {
  it("exige elegir el estado", () => {
    expect(pagoSchema.safeParse({}).success).toBe(false);
  });

  it("anticipo exige monto mayor a 0", () => {
    expect(pagoSchema.safeParse({ estado: "anticipo" }).success).toBe(false);
    expect(pagoSchema.safeParse({ estado: "anticipo", anticipo: 0 }).success).toBe(false);
    expect(pagoSchema.safeParse({ estado: "anticipo", anticipo: 25 }).success).toBe(true);
  });

  it("si no es anticipo, descarta el monto", () => {
    const r = pagoSchema.safeParse({ estado: "cancelado", anticipo: 25 });
    expect(r.success && r.data).toEqual({ estado: "cancelado" });
  });
});

describe("pendienteSchema", () => {
  it("cantidad entera positiva", () => {
    const ok = {
      cliente: "Rosa",
      grupo: "individual",
      descripcion: "Cuaderno",
      cantidad: 3,
      precioUnitario: 15,
    };
    expect(pendienteSchema.safeParse(ok).success).toBe(true);
    expect(pendienteSchema.safeParse({ ...ok, cantidad: 1.5 }).success).toBe(false);
  });
});

describe("nuevoEmpleadoSchema (Usuarios de Oscar)", () => {
  const ok = { nombre: "Luis", usuario: "Luis.P", password: "clave2026", confirmar: "clave2026" };

  it("normaliza el usuario a minúsculas", () => {
    const r = nuevoEmpleadoSchema.safeParse(ok);
    expect(r.success && r.data.usuario).toBe("luis.p");
  });

  it("contraseña de al menos 8, con letra y número, y que coincida", () => {
    expect(
      nuevoEmpleadoSchema.safeParse({ ...ok, password: "corta1", confirmar: "corta1" }).success,
    ).toBe(false);
    expect(
      nuevoEmpleadoSchema.safeParse({ ...ok, password: "solotexto", confirmar: "solotexto" })
        .success,
    ).toBe(false);
    expect(errores(nuevoEmpleadoSchema.safeParse({ ...ok, confirmar: "otra2026" }))).toContain(
      "Las contraseñas no coinciden",
    );
  });

  it("usuario sin espacios", () => {
    expect(nuevoEmpleadoSchema.safeParse({ ...ok, usuario: "luis perez" }).success).toBe(false);
  });
});
