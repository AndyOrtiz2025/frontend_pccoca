import { describe, expect, it } from "vitest";
import { comentarioSchema } from "./comentario.schema";

describe("comentarioSchema", () => {
  it("exige destinatario y mensaje", () => {
    expect(comentarioSchema.safeParse({ para: null, mensaje: "" }).success).toBe(false);
    expect(comentarioSchema.safeParse({ para: "paola", mensaje: "  " }).success).toBe(false);
  });

  it("acepta un comentario válido", () => {
    expect(comentarioSchema.safeParse({ para: "oscar", mensaje: "Falta cable HDMI" }).success).toBe(
      true,
    );
  });

  it("solo Paola u Oscar pueden recibir", () => {
    expect(comentarioSchema.safeParse({ para: "carlos", mensaje: "Hola equipo" }).success).toBe(
      false,
    );
  });
});
