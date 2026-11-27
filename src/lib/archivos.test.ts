import { describe, expect, it } from "vitest";
import { detectarTipo, nombreSeguro, validarArchivoCliente } from "./archivos";

const bytes = (...b: number[]) => new Uint8Array([...b, 0, 0, 0, 0, 0, 0, 0, 0]);

describe("detectarTipo (por contenido, no por extensión)", () => {
  it("reconoce PDF, JPG, PNG y WEBP", () => {
    expect(detectarTipo(bytes(0x25, 0x50, 0x44, 0x46, 0x2d))).toBe("application/pdf");
    expect(detectarTipo(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(detectarTipo(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(detectarTipo(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50))).toBe(
      "image/webp",
    );
  });

  it("rechaza ejecutables, HTML y archivos vacíos", () => {
    expect(detectarTipo(bytes(0x4d, 0x5a))).toBeNull(); // .exe
    expect(detectarTipo(new TextEncoder().encode("<html><script>"))).toBeNull();
    expect(detectarTipo(new Uint8Array())).toBeNull();
  });
});

describe("nombreSeguro", () => {
  it("quita rutas y caracteres peligrosos", () => {
    expect(nombreSeguro("../../etc/passwd")).toBe("passwd");
    expect(nombreSeguro('C:\\Users\\x\\DPI "frente".pdf')).toBe("DPI frente.pdf");
    expect(nombreSeguro("")).toBe("archivo");
    expect(nombreSeguro("a".repeat(300))).toHaveLength(100);
  });
});

describe("validarArchivoCliente", () => {
  it("limita tamaño y extensión", () => {
    expect(validarArchivoCliente({ name: "dpi.pdf", size: 1000 })).toBeNull();
    expect(validarArchivoCliente({ name: "dpi.pdf", size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
    expect(validarArchivoCliente({ name: "virus.exe", size: 10 })).toMatch(/solo PDF/);
  });
});
