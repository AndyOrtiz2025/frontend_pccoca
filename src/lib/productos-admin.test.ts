import { beforeEach, describe, expect, it } from "vitest";
import {
  administrarSubcategoria,
  cambiarActivoProducto,
  crearProducto,
  editarProducto,
  obtenerCatalogoVenta,
  obtenerImagen,
  obtenerProductosAdmin,
  obtenerSubcategorias,
  registrarMermaAdmin,
  ReglaNegocioError,
  sugerirCodigo,
  SinPermisoError,
} from "./api";
import { almacen, reiniciarAlmacen } from "./mocks/store";
import { productoSchema } from "@/schemas/producto.schema";

beforeEach(() => reiniciarAlmacen());

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const nuevo = (extra: object = {}) =>
  productoSchema.parse({
    nombre: "Goma de borrar",
    codigo: "LIB-0100",
    categoria: "libreria",
    precio: 1.5,
    costo: 0.75,
    aplicaConsumoInterno: false,
    stockInicial: 30,
    ...extra,
  });

describe("Productos de Paola", () => {
  it("solo administra Librería y Varios", async () => {
    await expect(obtenerProductosAdmin("paola", "tecnologia")).rejects.toThrow(SinPermisoError);
    await expect(
      crearProducto("paola", nuevo({ categoria: "tecnologia", codigo: "TEC-0100" })),
    ).rejects.toThrow(SinPermisoError);
    await expect(crearProducto("empleado", nuevo())).rejects.toThrow(SinPermisoError);
    expect(await sugerirCodigo("paola", "libreria")).toMatch(/^LIB-\d{4}$/);
  });

  it("crea un producto con foto y aparece en la venta (sin costo)", async () => {
    const p = await crearProducto("paola", nuevo(), PNG);
    expect(p.imagenUrl).toMatch(/^\/api\/imagenes\/IMG-/);
    const id = p.imagenUrl!.split("/").pop()!;
    expect((await obtenerImagen(id)).tipo).toBe("image/png");
    const venta = (await obtenerCatalogoVenta("libreria")).find((x) => x.id === p.id)!;
    expect(venta.imagenUrl).toBe(p.imagenUrl);
    expect(venta).not.toHaveProperty("costo");
  });

  it("rechaza fotos que no son imagen (aunque se llamen .jpg)", async () => {
    const pdf = new TextEncoder().encode("%PDF-1.4 falso");
    await expect(crearProducto("paola", nuevo(), pdf)).rejects.toThrow(/JPG, PNG o WebP/);
  });

  it("los archivos de trámites no se pueden pedir como imagen", async () => {
    await expect(obtenerImagen("AR-demo-dpi")).rejects.toThrow(ReglaNegocioError);
  });

  it("no repite código ni código de barras", async () => {
    await expect(crearProducto("paola", nuevo({ codigo: "LIB-0021" }))).rejects.toThrow(/ya es de/);
    await expect(crearProducto("paola", nuevo({ codigoBarras: "LIB-0034" }))).rejects.toThrow(
      /código de barras/,
    );
  });

  it("editar cambia precio y foto; quitar la foto la borra", async () => {
    const p = await crearProducto("paola", nuevo(), PNG);
    const vieja = p.imagenUrl!.split("/").pop()!;
    await editarProducto("paola", p.id, nuevo({ precio: 2, mayoreo: { desde: 10, precio: 1.75 } }));
    expect(almacen().productos.find((x) => x.id === p.id)).toMatchObject({
      precio: 2,
      mayoreo: { desde: 10, precio: 1.75 },
      imagenUrl: p.imagenUrl,
    });
    await editarProducto("paola", p.id, nuevo(), null);
    expect(almacen().productos.find((x) => x.id === p.id)?.imagenUrl).toBeUndefined();
    await expect(obtenerImagen(vieja)).rejects.toThrow();
  });

  it("no cambia la categoría al editar", async () => {
    await expect(
      editarProducto("paola", "p-lib-0021", nuevo({ categoria: "varios", codigo: "VAR-0100" })),
    ).rejects.toThrow(/categoría/);
  });

  it("desactivar lo quita de la venta y reactivar lo regresa", async () => {
    await cambiarActivoProducto("paola", "p-lib-0021", false);
    expect((await obtenerCatalogoVenta("libreria")).some((p) => p.id === "p-lib-0021")).toBe(false);
    expect(
      (await obtenerProductosAdmin("paola", "libreria")).some((p) => p.id === "p-lib-0021"),
    ).toBe(true);
    await cambiarActivoProducto("paola", "p-lib-0021", true);
    expect((await obtenerCatalogoVenta("libreria")).some((p) => p.id === "p-lib-0021")).toBe(true);
  });

  it("merma descuenta stock y queda registrada con motivo", async () => {
    await registrarMermaAdmin(
      "paola",
      { productoId: "p-lib-0034", presentacion: "unidad", cantidad: 3, motivo: "Humedad" },
      "Paola",
    );
    const folder = almacen().productos.find((p) => p.id === "p-lib-0034")!;
    expect(folder.stock).toMatchObject({ sueltas: 5, paquetes: 3 });
    expect(almacen().movimientos.at(-1)).toMatchObject({ tipo: "merma", motivo: "Humedad" });
    await expect(
      registrarMermaAdmin(
        "paola",
        { productoId: "p-lib-0021", presentacion: "unidad", cantidad: 999, motivo: "Rotas" },
        "Paola",
      ),
    ).rejects.toThrow(ReglaNegocioError);
  });
});

describe("Subcategorías", () => {
  const nombres = async () =>
    (await obtenerSubcategorias("paola", "libreria")).map((s) => s.nombre);

  it("lista las de los productos con su conteo", async () => {
    const lista = await obtenerSubcategorias("paola", "libreria");
    expect(lista.find((s) => s.nombre === "Folders")?.productos).toBe(2);
    await expect(obtenerSubcategorias("paola", "tecnologia")).rejects.toThrow(SinPermisoError);
  });

  it("crea una vacía y no repite (sin importar tildes ni mayúsculas)", async () => {
    await administrarSubcategoria("paola", {
      accion: "crear",
      categoria: "libreria",
      nombre: "Arte",
    });
    expect(await nombres()).toContain("Arte");
    await expect(
      administrarSubcategoria("paola", {
        accion: "crear",
        categoria: "libreria",
        nombre: "utiles escolares",
      }),
    ).rejects.toThrow(/Ya existe "Útiles escolares"/);
  });

  it("renombrar actualiza todos sus productos", async () => {
    const r = await administrarSubcategoria("paola", {
      accion: "renombrar",
      categoria: "libreria",
      de: "Folders",
      a: "Fólderes",
    });
    expect(r.productosMovidos).toBe(2);
    expect(almacen().productos.find((p) => p.id === "p-lib-0034")?.subcategoria).toBe("Fólderes");
    expect(await nombres()).not.toContain("Folders");
  });

  it("unir: renombrar a una que ya existe pasa los productos y conserva su nombre", async () => {
    await administrarSubcategoria("paola", {
      accion: "renombrar",
      categoria: "libreria",
      de: "Oficina",
      a: "útiles ESCOLARES",
    });
    const lista = await obtenerSubcategorias("paola", "libreria");
    expect(lista.some((s) => s.nombre === "Oficina")).toBe(false);
    expect(lista.find((s) => s.nombre === "Útiles escolares")?.productos).toBeGreaterThan(2);
  });

  it("solo elimina las que no tienen productos", async () => {
    await expect(
      administrarSubcategoria("paola", {
        accion: "eliminar",
        categoria: "libreria",
        nombre: "Folders",
      }),
    ).rejects.toThrow(/tiene 2 productos/);
    await administrarSubcategoria("paola", {
      accion: "crear",
      categoria: "libreria",
      nombre: "Arte",
    });
    await administrarSubcategoria("paola", {
      accion: "eliminar",
      categoria: "libreria",
      nombre: "arte",
    });
    expect(await nombres()).not.toContain("Arte");
  });
});
