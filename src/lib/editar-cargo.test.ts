import { beforeEach, describe, expect, it } from "vitest";
import { editarCargo, ReglaNegocioError } from "./api";
import { almacen, reiniciarAlmacen } from "./mocks/store";
import { editarCargoSchema } from "@/schemas/pendiente.schema";

beforeEach(() => reiniciarAlmacen());

const ahora = new Date("2026-11-28T18:00:00Z");
const cargo = (id: string) => almacen().cargos.find((c) => c.id === id)!;
const disponible = (id: string) => {
  const s = almacen().productos.find((p) => p.id === id)!.stock;
  return s.tipo === "simple" ? s.disponible : s.sueltas;
};

describe("Editar un cargo de la cuenta", () => {
  it("corrige descripción, precio y nota de algo libre, y guarda quién lo editó", async () => {
    const c = await editarCargo(
      "cu-6",
      "ca-6",
      editarCargoSchema.parse({
        tipo: "libre",
        descripcion: "Impresiones de hojas de servicios",
        precioUnitario: 0.5,
        cantidad: 60,
        llevadoPor: "Ana Ruiz",
        nota: "  ",
      }),
      "Ana",
      ahora,
    );
    expect(c).toMatchObject({
      descripcion: "Impresiones de hojas de servicios",
      cantidad: 60,
      registradoPor: "Carlos",
      editado: { por: "Ana", fecha: ahora.toISOString() },
    });
    expect(c.nota).toBeUndefined();
  });

  it("producto: al cambiar la cantidad se ajusta el stock y el precio (con mayoreo)", async () => {
    const antes = disponible("p-lib-0050");
    await editarCargo("cu-1", "ca-1", { tipo: "producto", cantidad: 12 }, "Carlos", ahora);
    expect(disponible("p-lib-0050")).toBe(antes - 9);
    expect(cargo("ca-1")).toMatchObject({ cantidad: 12, precioUnitario: 13 });
    await editarCargo("cu-1", "ca-1", { tipo: "producto", cantidad: 2 }, "Carlos", ahora);
    expect(disponible("p-lib-0050")).toBe(antes + 1);
    expect(cargo("ca-1")).toMatchObject({ cantidad: 2, precioUnitario: 15 });
  });

  it("en organizaciones se puede borrar quién se lo llevó", async () => {
    await editarCargo(
      "cu-6",
      "ca-7",
      { tipo: "producto", cantidad: 10, llevadoPor: "" },
      "Carlos",
      ahora,
    );
    expect(cargo("ca-7").llevadoPor).toBeUndefined();
  });

  it("no edita lo ya pagado, ni deja el total por debajo de lo abonado", async () => {
    await expect(
      editarCargo(
        "cu-7",
        "ca-8",
        { tipo: "libre", descripcion: "Copias", precioUnitario: 0.5, cantidad: 10 },
        "Ana",
        ahora,
      ),
    ).rejects.toThrow("ya se pagó");
    // Centro Estudiantil abonó Q 20: el total (Q 40) no puede bajar de eso.
    await expect(
      editarCargo(
        "cu-6",
        "ca-6",
        { tipo: "libre", descripcion: "Impresiones", precioUnitario: 0.5, cantidad: 2 },
        "Ana",
        ahora,
      ),
    ).rejects.toThrow("Ya pagó Q 20.00");
    expect(cargo("ca-6").cantidad).toBe(50);
  });

  it("no cambia el tipo ni deja pasar stock que no hay", async () => {
    await expect(
      editarCargo(
        "cu-1",
        "ca-1",
        { tipo: "libre", descripcion: "x y", precioUnitario: 1, cantidad: 1 },
        "Ana",
        ahora,
      ),
    ).rejects.toThrow(ReglaNegocioError);
    await expect(
      editarCargo("cu-1", "ca-1", { tipo: "producto", cantidad: 9000 }, "Ana", ahora),
    ).rejects.toThrow("Cuaderno universitario");
    expect(cargo("ca-1").cantidad).toBe(3);
  });
});
