import { describe, expect, it } from "vitest";
import { autenticarMock } from "./mock-users";
import { estaBloqueado, limpiarIntentos, registrarFallo } from "./rate-limit";
import { rolDeRuta } from "./roles";
import { loginSchema, MAX_PASSWORD, recuperarSchema } from "@/schemas/auth.schema";
import { firmarSesion, leerSesion } from "./session";

describe("sesión firmada", () => {
  it("lee lo que firma", async () => {
    const token = await firmarSesion({ usuario: "paola", nombre: "Paola", rol: "paola" });
    expect(await leerSesion(token)).toEqual({ usuario: "paola", nombre: "Paola", rol: "paola" });
  });

  it("rechaza un token alterado o vacío", async () => {
    const token = await firmarSesion({ usuario: "carlos", nombre: "Carlos", rol: "empleado" });
    const [h, , f] = token.split(".");
    const falso = Buffer.from(
      JSON.stringify({ sub: "carlos", nombre: "Carlos", rol: "paola" }),
    ).toString("base64url");
    expect(await leerSesion(`${h}.${falso}.${f}`)).toBeNull();
    expect(await leerSesion(undefined)).toBeNull();
    expect(await leerSesion("basura")).toBeNull();
  });
});

describe("rolDeRuta", () => {
  it("identifica el rol por el primer segmento", () => {
    expect(rolDeRuta("/paola/reportes")).toBe("paola");
    expect(rolDeRuta("/empleado")).toBe("empleado");
    expect(rolDeRuta("/login/oscar")).toBeNull();
    expect(rolDeRuta("/")).toBeNull();
  });
});

describe("autenticarMock", () => {
  it("exige que el usuario pertenezca al perfil elegido", () => {
    expect(autenticarMock("paola", "paola", "pccoca2026")?.rol).toBe("paola");
    expect(autenticarMock("empleado", "paola", "pccoca2026")).toBeNull();
    expect(autenticarMock("paola", "paola", "otra")).toBeNull();
  });
});

describe("validación del login", () => {
  it("pide usuario y contraseña", () => {
    expect(loginSchema.safeParse({ perfil: "oscar", usuario: " ", password: "" }).success).toBe(
      false,
    );
  });

  it("limita la contraseña a 72 caracteres (BCrypt)", () => {
    const larga = "a".repeat(MAX_PASSWORD + 1);
    expect(
      loginSchema.safeParse({ perfil: "oscar", usuario: "oscar", password: larga }).success,
    ).toBe(false);
  });

  it("valida el correo de recuperación", () => {
    expect(recuperarSchema.safeParse({ correo: "paola@pccoca.com" }).success).toBe(true);
    expect(recuperarSchema.safeParse({ correo: "paola" }).success).toBe(false);
  });
});

describe("límite de intentos", () => {
  it("bloquea después de 5 fallos y se limpia al entrar bien", () => {
    const claves = ["ip:prueba", "usuario:prueba"];
    for (let i = 0; i < 4; i++) registrarFallo(claves);
    expect(estaBloqueado(claves)).toBe(false);
    registrarFallo(claves);
    expect(estaBloqueado(claves)).toBe(true);
    limpiarIntentos(claves);
    expect(estaBloqueado(claves)).toBe(false);
  });

  it("se desbloquea después de 15 minutos", () => {
    const claves = ["ip:tiempo"];
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) registrarFallo(claves, t0);
    expect(estaBloqueado(claves, t0)).toBe(true);
    expect(estaBloqueado(claves, t0 + 15 * 60 * 1000 + 1)).toBe(false);
  });
});
