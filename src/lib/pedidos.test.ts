import { beforeEach, describe, expect, it } from "vitest";
import {
  cambiarPrecioProducto,
  cerrarPedido,
  crearPedido,
  crearProducto,
  editarPedido,
  obtenerDetalleProveedor,
  obtenerPedido,
  obtenerPedidos,
  obtenerPendientesAnteriores,
  recibirPedido,
  registrarCompra,
  ReglaNegocioError,
  SinPermisoError,
} from "./api";
import { almacen, reiniciarAlmacen } from "./mocks/store";
import { estadoPedido, siguienteNumeroPedido, sugerirPedido } from "./reglas/pedidos";
import { pedidoSchema, recibirPedidoSchema } from "@/schemas/pedido.schema";
import { productoSchema } from "@/schemas/producto.schema";

beforeEach(() => reiniciarAlmacen());

const hoy = new Date("2026-11-27T16:00:00Z");
const prod = (id: string) => almacen().productos.find((p) => p.id === id)!;
const pedido = (id: string) => almacen().pedidos.find((p) => p.id === id)!;
const recibir = (id: string, datos: object) =>
  recibirPedido(
    "paola",
    id,
    recibirPedidoSchema.parse({ fecha: "2026-11-27", ...datos }),
    "Paola",
    hoy,
  );

describe("Reglas de pedidos", () => {
  it("numera y calcula el estado de sus líneas", () => {
    expect(siguienteNumeroPedido([{ numero: "P-0001" }, { numero: "P-0009" }])).toBe("P-0010");
    expect(siguienteNumeroPedido([])).toBe("P-0001");
    const l = { id: "x", nombre: "x", presentacion: "unidad" as const, cantidad: 10 };
    expect(estadoPedido({ lineas: [{ ...l, recibidas: 0, estado: "pendiente" }] })).toBe(
      "pendiente",
    );
    expect(estadoPedido({ lineas: [{ ...l, recibidas: 4, estado: "pendiente" }] })).toBe("parcial");
    expect(estadoPedido({ lineas: [{ ...l, recibidas: 4, estado: "completa" }] })).toBe("recibido");
    expect(estadoPedido({ lineas: [{ ...l, recibidas: 0, estado: "cancelada" }] })).toBe(
      "cancelado",
    );
  });

  it("sugiere lo que se está acabando de lo que surte el proveedor", () => {
    const productos = almacen().productos;
    const s = sugerirPedido(productos, { id: "prov-3", surte: ["libreria"] }, ["libreria"]);
    // Lapicero azul (3 de 120, de Importadora Xela): se piden 117.
    expect(s.find((x) => x.productoId === "p-lib-0061")).toMatchObject({
      presentacion: "unidad",
      cantidad: 117,
      nivel: "critico",
    });
    // Folder oficio es de otro proveedor: no se sugiere aquí.
    expect(s.some((x) => x.productoId === "p-lib-0035")).toBe(false);
    // Por caja en los fraccionables.
    const progreso = sugerirPedido(productos, { id: "prov-2", surte: ["libreria"] }, ["libreria"]);
    expect(progreso.find((x) => x.productoId === "p-lib-0035")).toMatchObject({
      presentacion: "paquete",
      agotado: true,
    });
  });

  it("valida el pedido y la revisión", () => {
    expect(pedidoSchema.safeParse({ proveedorId: "prov-1", lineas: [] }).success).toBe(false);
    const sinNombre = pedidoSchema.safeParse({
      proveedorId: "prov-1",
      lineas: [{ presentacion: "unidad", cantidad: 2 }],
    });
    expect(sinNombre.error?.issues[0]?.message).toBe("Escribe el nombre del producto");
    expect(
      recibirPedidoSchema.safeParse({ fecha: "2026-11-27", lineas: [], cancelar: [] }).success,
    ).toBe(false);
  });
});

describe("Pedidos", () => {
  it("lista los de Paola con su estado; el Empleado no entra", async () => {
    const lista = await obtenerPedidos("paola");
    expect(lista.map((p) => [p.numero, p.estado, p.porLlegar])).toEqual([
      ["P-0002", "pendiente", 3],
      ["P-0001", "parcial", 1],
    ]);
    await expect(obtenerPedidos("empleado")).rejects.toThrow(SinPermisoError);
    expect(await obtenerPedidos("oscar")).toEqual([]);
    expect(await obtenerPedido("oscar", "ped-demo-1")).toBeNull();
  });

  it("crea un pedido con productos nuestros y uno que no tenemos", async () => {
    const p = await crearPedido(
      "paola",
      pedidoSchema.parse({
        proveedorId: "prov-1",
        lineas: [
          { productoId: "p-lib-0021", presentacion: "unidad", cantidad: 12 },
          { nombre: "Goma blanca 250 ml", presentacion: "unidad", cantidad: 6 },
        ],
      }),
      "Paola",
      hoy,
    );
    expect(p.numero).toBe("P-0003");
    expect(p.lineas.map((l) => [l.nombre, l.productoId])).toEqual([
      ["Hojas carta 75g (resma)", "p-lib-0021"],
      ["Goma blanca 250 ml", undefined],
    ]);
    const detalle = await obtenerPedido("paola", p.id);
    expect(detalle?.lineas[0]).toMatchObject({ codigo: "LIB-0021", costo: 33, faltan: 12 });
  });

  it("rechaza repetidos, caja en un producto suelto y productos de Tecnología", async () => {
    const crear = (lineas: object[]) =>
      crearPedido("paola", { proveedorId: "prov-1", lineas } as never, "Paola", hoy);
    const resma = { productoId: "p-lib-0021", presentacion: "unidad", cantidad: 1 };
    await expect(crear([resma, resma])).rejects.toThrow("repetido");
    await expect(crear([{ ...resma, presentacion: "paquete" }])).rejects.toThrow("por caja");
    await expect(
      crear([{ productoId: "p-tec-0012", presentacion: "unidad", cantidad: 1 }]),
    ).rejects.toThrow(SinPermisoError);
  });

  it("pasa lo que faltaba de un pedido anterior al nuevo", async () => {
    const pendientes = await obtenerPendientesAnteriores("paola", "prov-2");
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0]).toMatchObject({ numero: "P-0001", linea: { faltan: 6 } });
    const nuevo = await crearPedido(
      "paola",
      {
        proveedorId: "prov-2",
        lineas: [
          {
            productoId: "p-lib-0035",
            presentacion: "paquete",
            cantidad: 6,
            traerDe: { pedidoId: "ped-demo-1", lineaId: "lp-1" },
          },
        ],
      },
      "Paola",
      hoy,
    );
    expect(pedido("ped-demo-1").lineas[0]).toMatchObject({
      estado: "movida",
      movidaA: nuevo.numero,
    });
    // El P-0001 queda recibido: ya no se espera nada de él.
    expect(estadoPedido(pedido("ped-demo-1"))).toBe("recibido");
    expect(await obtenerPendientesAnteriores("paola", "prov-2", nuevo.id)).toEqual([]);
    // No se puede volver a traer.
    await expect(
      crearPedido(
        "paola",
        {
          proveedorId: "prov-2",
          lineas: [
            {
              productoId: "p-lib-0035",
              presentacion: "paquete",
              cantidad: 6,
              traerDe: { pedidoId: "ped-demo-1", lineaId: "lp-1" },
            },
          ],
        },
        "Paola",
        hoy,
      ),
    ).rejects.toThrow("ya no está disponible");
  });

  it("revisar paquete: lo que vino entra al stock, lo demás sigue pendiente", async () => {
    const lapicero = prod("p-lib-0061");
    const r = await recibir("ped-demo-2", {
      factura: "FAC-1",
      lineas: [
        { lineaId: "lp-3", presentacion: "unidad", buenas: 100, danadas: 0, costoUnitario: 0.9 },
        {
          lineaId: "lp-4",
          presentacion: "unidad",
          buenas: 10,
          danadas: 2,
          costoUnitario: 12,
          motivoDano: "Mojados",
        },
      ],
    });
    expect(r.compra?.total).toBe(234);
    expect(r.reclamos).toBe(1);
    expect(r.estado).toBe("parcial");
    expect(r.avisos.map((a) => [a.nombre, a.antes, a.ahora, a.precio])).toEqual([
      ["Cuaderno universitario", 9.5, 12, 15],
    ]);
    expect(lapicero.stock).toMatchObject({ disponible: 103 });
    const p = pedido("ped-demo-2");
    expect(p.lineas.map((l) => [l.recibidas, l.estado])).toEqual([
      [100, "pendiente"], // faltan 20
      [12, "pendiente"], // faltan 12
      [0, "pendiente"], // crayones: no vinieron
    ]);
    expect(p.recepciones[0]).toMatchObject({ factura: "FAC-1", total: 234, por: "Paola" });
    expect(almacen().compras.at(-1)?.proveedorId).toBe("prov-3");
  });

  it("no esperar el resto, ya no se pide y producto nuevo creado al llegar", async () => {
    await expect(
      recibir("ped-demo-2", {
        lineas: [
          { lineaId: "lp-5", presentacion: "unidad", buenas: 10, danadas: 0, costoUnitario: 8 },
        ],
      }),
    ).rejects.toThrow('Crea el producto "Crayones 12 colores"');

    const crayones = await crearProducto(
      "paola",
      productoSchema.parse({
        codigo: "LIB-0071",
        nombre: "Crayones 12 colores",
        categoria: "libreria",
        precio: 12,
        costo: 8,
        aplicaConsumoInterno: false,
        stockInicial: 0,
        stockReferencia: 20,
      }),
    );
    const r = await recibir("ped-demo-2", {
      lineas: [
        {
          lineaId: "lp-3",
          presentacion: "unidad",
          buenas: 100,
          danadas: 0,
          costoUnitario: 0.9,
          noEsperarResto: true,
        },
        {
          lineaId: "lp-5",
          productoId: crayones.id,
          presentacion: "unidad",
          buenas: 10,
          danadas: 0,
          costoUnitario: 8,
        },
      ],
      cancelar: ["lp-4"],
    });
    expect(r.estado).toBe("recibido");
    const p = pedido("ped-demo-2");
    expect(p.lineas.map((l) => l.estado)).toEqual(["completa", "cancelada", "completa"]);
    expect(p.lineas[2]).toMatchObject({ productoId: crayones.id, recibidas: 10 });
    expect(prod(crayones.id).stock).toMatchObject({ disponible: 10 });
    await expect(recibir("ped-demo-2", { cancelar: ["lp-4"] })).rejects.toThrow("cerrado");
  });

  it("si la compra falla, el pedido no cambia", async () => {
    almacen().proveedores.find((p) => p.id === "prov-3")!.activo = false;
    await expect(
      recibir("ped-demo-2", {
        lineas: [
          { lineaId: "lp-3", presentacion: "unidad", buenas: 1, danadas: 0, costoUnitario: 1 },
        ],
        cancelar: ["lp-4"],
      }),
    ).rejects.toThrow("inactivo");
    expect(pedido("ped-demo-2").lineas.map((l) => l.estado)).toEqual([
      "pendiente",
      "pendiente",
      "pendiente",
    ]);
  });

  it("se edita solo antes de que llegue algo; se puede cerrar", async () => {
    const datos = {
      proveedorId: "prov-3",
      lineas: [{ productoId: "p-lib-0061", presentacion: "unidad" as const, cantidad: 50 }],
    };
    await editarPedido("paola", "ped-demo-2", datos);
    expect(pedido("ped-demo-2").lineas).toHaveLength(1);
    await expect(
      editarPedido("paola", "ped-demo-2", { ...datos, proveedorId: "prov-1" }),
    ).rejects.toThrow("no se cambia");
    await expect(
      editarPedido("paola", "ped-demo-1", { ...datos, proveedorId: "prov-2" }),
    ).rejects.toThrow(ReglaNegocioError);
    expect(await cerrarPedido("paola", "ped-demo-2")).toBe("cancelado");
    expect(await cerrarPedido("paola", "ped-demo-1")).toBe("recibido");
  });

  it("el proveedor muestra sus pedidos abiertos", async () => {
    const d = await obtenerDetalleProveedor("paola", "prov-3", hoy);
    expect(d?.pedidosAbiertos).toEqual([
      expect.objectContaining({ numero: "P-0002", porLlegar: 3 }),
    ]);
  });
});

describe("Nuevo precio desde el aviso", () => {
  it("cambia el precio por unidad o por caja, respetando el mayoreo", async () => {
    await cambiarPrecioProducto("paola", "p-lib-0050", { presentacion: "unidad", precio: 17 });
    expect(prod("p-lib-0050").precio).toBe(17);
    await cambiarPrecioProducto("paola", "p-lib-0045", { presentacion: "paquete", precio: 24 });
    expect(prod("p-lib-0045").fraccionable?.precioPaquete).toBe(24);
    // Cuaderno tiene mayoreo a Q 13: el precio no puede quedar en Q 12.
    await expect(
      cambiarPrecioProducto("paola", "p-lib-0050", { presentacion: "unidad", precio: 12 }),
    ).rejects.toThrow("mayoreo");
    await expect(
      cambiarPrecioProducto("paola", "p-lib-0061", { presentacion: "paquete", precio: 5 }),
    ).rejects.toThrow("por caja");
    await expect(
      cambiarPrecioProducto("paola", "p-tec-0012", { presentacion: "unidad", precio: 5 }),
    ).rejects.toThrow(SinPermisoError);
  });

  it("el aviso de la compra trae el precio actual", async () => {
    const r = await registrarCompra(
      "paola",
      {
        proveedorId: "prov-3",
        fecha: "2026-11-27",
        lineas: [
          {
            productoId: "p-lib-0045",
            presentacion: "paquete",
            cantidad: 1,
            danadas: 0,
            costoUnitario: 19,
          },
        ],
      },
      "Paola",
      hoy,
    );
    expect(r.avisos[0]).toMatchObject({ antes: 18, ahora: 19, precio: 22 });
  });
});
