import { describe, expect, it } from "vitest";
import { MAX_BYTES_FOTO } from "./api";
import { leerFormularioProducto } from "./formulario-producto";

const datos = {
  nombre: "Folder tamaño carta",
  codigo: "LIB-0034",
  categoria: "libreria",
  precio: 2,
  costo: 1.1,
  aplicaConsumoInterno: false,
  stockInicial: 10,
};

function peticion(form: FormData, largo?: number) {
  const r = new Request("http://localhost/api/productos", { method: "POST", body: form });
  if (largo === undefined) return r;
  return new Request(r, { headers: { "content-length": String(largo) } });
}

describe("leerFormularioProducto (Nuevo / Editar producto)", () => {
  it("lee los datos y la foto", async () => {
    const form = new FormData();
    form.set("datos", JSON.stringify(datos));
    form.set("foto", new File([new Uint8Array([1, 2, 3])], "foto.png", { type: "image/png" }));
    const r = await leerFormularioProducto(peticion(form));
    expect(r.ok && r.datos.nombre).toBe("Folder tamaño carta");
    expect(r.ok && r.foto).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("quitar la foto al editar", async () => {
    const form = new FormData();
    form.set("datos", JSON.stringify(datos));
    form.set("quitarFoto", "1");
    const r = await leerFormularioProducto(peticion(form));
    expect(r.ok && r.foto).toBeNull();
  });

  it("rechaza datos inválidos, JSON roto y fotos de más de 2 MB", async () => {
    const malo = new FormData();
    malo.set("datos", JSON.stringify({ ...datos, nombre: "" }));
    expect(await leerFormularioProducto(peticion(malo))).toMatchObject({ ok: false, status: 400 });

    const roto = new FormData();
    roto.set("datos", "{no es json");
    expect(await leerFormularioProducto(peticion(roto))).toMatchObject({
      ok: false,
      error: "Formulario inválido",
    });

    const grande = new FormData();
    grande.set("datos", JSON.stringify(datos));
    grande.set("foto", new File([new Uint8Array(MAX_BYTES_FOTO + 1)], "foto.png"));
    expect(await leerFormularioProducto(peticion(grande))).toMatchObject({
      ok: false,
      status: 413,
    });

    expect(
      await leerFormularioProducto(peticion(new FormData(), MAX_BYTES_FOTO * 2)),
    ).toMatchObject({ ok: false, status: 413 });
  });
});
