import { describe, expect, it } from "vitest";
import { ROLES } from "@/lib/auth/roles";
import { hrefActivo, MENU, paginasDeRol, tituloDeRuta } from "./navegacion";

describe("menú por rol", () => {
  it("cada página pertenece a la ruta de su rol", () => {
    for (const rol of ROLES) {
      for (const p of paginasDeRol(rol)) expect(p.href.startsWith(`/${rol}`)).toBe(true);
    }
  });

  it("no repite rutas dentro de un rol", () => {
    for (const rol of ROLES) {
      const hrefs = paginasDeRol(rol).map((p) => p.href);
      expect(new Set(hrefs).size).toBe(hrefs.length);
    }
  });

  it("Paola no ve Servicios Técnicos ni Usuarios (documentación, sección 9)", () => {
    const etiquetas = MENU.paola.flatMap((g) => g.items.map((i) => i.label));
    expect(etiquetas).not.toContain("Servicios Técnicos");
    expect(etiquetas).not.toContain("Usuarios");
  });

  it("solo Oscar administra Usuarios", () => {
    expect(paginasDeRol("oscar").some((p) => p.href === "/oscar/usuarios")).toBe(true);
    expect(paginasDeRol("empleado").some((p) => p.href.endsWith("/usuarios"))).toBe(false);
  });
});

describe("tituloDeRuta y hrefActivo", () => {
  it("usa la coincidencia más larga", () => {
    expect(tituloDeRuta("paola", "/paola/tramites/en-proceso")).toBe("Trámites en proceso");
    expect(tituloDeRuta("paola", "/paola/tramites")).toBe("Trámites");
    expect(hrefActivo("paola", "/paola/tramites/entradas")).toBe("/paola/tramites/entradas");
  });

  it("el Dashboard solo está activo en el inicio", () => {
    expect(hrefActivo("empleado", "/empleado")).toBe("/empleado");
    expect(hrefActivo("empleado", "/empleado/pendientes")).toBe("/empleado/pendientes");
  });

  it("una subpágina de detalle mantiene activo a su padre", () => {
    expect(hrefActivo("paola", "/paola/proveedores/123")).toBe("/paola/proveedores");
  });

  it("separa los dos Seguimiento del Empleado", () => {
    expect(hrefActivo("empleado", "/empleado/seguimiento/servicios")).toBe(
      "/empleado/seguimiento/servicios",
    );
  });
});
