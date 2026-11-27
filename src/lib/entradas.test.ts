import { beforeEach, describe, expect, it } from "vitest";
import {
  crearEntradaServicio,
  crearEntradaTramite,
  obtenerArchivo,
  obtenerEntradas,
  ReglaNegocioError,
  SinPermisoError,
} from "./api";
import { reiniciarAlmacen } from "./mocks/store";

beforeEach(() => reiniciarAlmacen());

describe("crearEntradaTramite (sección 8.9)", () => {
  it("guarda la entrada con el nombre del catálogo y llega a la bandeja de Paola", async () => {
    const e = await crearEntradaTramite(
      {
        cliente: { nombre: "  Ana Ramírez ", telefono: "" },
        tramiteId: "sat-nit",
        documentos: [{ nombre: "DPI escaneado (ambos lados)", entregado: true }],
        pago: { estado: "cancelado" },
      },
      "Carlos",
    );
    expect(e.tramiteNombre).toBe("SAT · NIT por primera vez");
    expect(e.cliente).toEqual({ nombre: "Ana Ramírez" });
    expect(e.leida).toBe(false);
    expect(e.enviadaPor).toBe("Carlos");
    const bandeja = await obtenerEntradas("paola");
    expect(bandeja[0]!.id).toBe(e.id);
  });

  it("los documentos son los requisitos del trámite; ignora los inventados", async () => {
    const e = await crearEntradaTramite(
      {
        cliente: { nombre: "Ana" },
        tramiteId: "otros-penales",
        documentos: [
          { nombre: "DPI", entregado: true },
          { nombre: "Algo inventado", entregado: true },
        ],
        pago: { estado: "pendiente" },
      },
      "Carlos",
    );
    expect(e.documentos).toEqual([
      { nombre: "Boleta de pago", entregado: false },
      { nombre: "DPI", entregado: true },
    ]);
  });

  it("rechaza un trámite que no existe", async () => {
    await expect(
      crearEntradaTramite(
        {
          cliente: { nombre: "Ana" },
          tramiteId: "no-existe",
          documentos: [],
          pago: { estado: "pendiente" },
        },
        "Carlos",
      ),
    ).rejects.toThrow(ReglaNegocioError);
  });
});

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
const EXE = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
const base = { cliente: { nombre: "Ana" }, tramiteId: "sat-nit", documentos: [] }; // NIT: Q 80.00

describe("pago de la entrada", () => {
  it("guarda el anticipo", async () => {
    const e = await crearEntradaTramite(
      { ...base, pago: { estado: "anticipo", anticipo: 40 } },
      "Carlos",
    );
    expect(e.pago).toEqual({ estado: "anticipo", anticipo: 40 });
  });

  it("un anticipo igual o mayor al precio debe marcarse como Cancelado", async () => {
    await expect(
      crearEntradaTramite({ ...base, pago: { estado: "anticipo", anticipo: 80 } }, "Carlos"),
    ).rejects.toThrow(/Cancelado/);
  });
});

describe("datos del cliente", () => {
  it("se guardan aparte de las notas", async () => {
    const e = await crearEntradaTramite(
      {
        ...base,
        pago: { estado: "pendiente" },
        datosCliente: " Correo: ana@gmail.com ",
        notas: "viernes",
      },
      "Carlos",
    );
    expect(e.datosCliente).toBe("Correo: ana@gmail.com");
    expect(e.notas).toBe("viernes");
  });
});

describe("archivos de la entrada", () => {
  it("guarda el archivo con nombre seguro y tipo detectado por su contenido", async () => {
    const e = await crearEntradaTramite({ ...base, pago: { estado: "cancelado" } }, "Carlos", [
      { nombre: "C:\\fotos\\DPI ambos lados.pdf", datos: PDF },
    ]);
    expect(e.archivos).toHaveLength(1);
    expect(e.archivos[0]).toMatchObject({
      nombre: "DPI ambos lados.pdf",
      tipo: "application/pdf",
      tamano: 8,
    });
    const { datos } = await obtenerArchivo("paola", e.archivos[0]!.id);
    expect(datos).toEqual(PDF);
  });

  it("rechaza un programa renombrado como .pdf y no guarda nada", async () => {
    await expect(
      crearEntradaTramite({ ...base, pago: { estado: "cancelado" } }, "Carlos", [
        { nombre: "DPI.pdf", datos: EXE },
      ]),
    ).rejects.toThrow(/solo se aceptan/);
    expect(
      (await obtenerEntradas("paola")).every(
        (x) => x.tipo !== "tramite" || x.cliente.nombre !== "Ana",
      ),
    ).toBe(true);
  });

  it("máximo 5 archivos", async () => {
    const seis = Array.from({ length: 6 }, (_, i) => ({ nombre: `a${i}.pdf`, datos: PDF }));
    await expect(
      crearEntradaTramite({ ...base, pago: { estado: "cancelado" } }, "Carlos", seis),
    ).rejects.toThrow(/Máximo 5/);
  });

  it("solo Paola descarga los archivos", async () => {
    const e = await crearEntradaTramite({ ...base, pago: { estado: "cancelado" } }, "Carlos", [
      { nombre: "dpi.pdf", datos: PDF },
    ]);
    await expect(obtenerArchivo("oscar", e.archivos[0]!.id)).rejects.toThrow(SinPermisoError);
    await expect(obtenerArchivo("empleado", e.archivos[0]!.id)).rejects.toThrow(SinPermisoError);
  });
});

describe("crearEntradaServicio (sección 8.10)", () => {
  it("llega a la bandeja de Oscar y no a la de Paola", async () => {
    const e = await crearEntradaServicio(
      {
        cliente: { nombre: "Juan" },
        equipo: "Laptop",
        falla: " No enciende ",
        accesorios: ["Cargador", " "],
      },
      "Ana",
    );
    expect(e.falla).toBe("No enciende");
    expect(e.accesorios).toEqual(["Cargador"]);
    expect((await obtenerEntradas("oscar")).some((x) => x.id === e.id)).toBe(true);
    expect((await obtenerEntradas("paola")).some((x) => x.id === e.id)).toBe(false);
  });
});
