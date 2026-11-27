import { describe, expect, it } from "vitest";
import { formatearTelefono } from "./TelefonoInput";

describe("formatearTelefono", () => {
  it("pone el guion y no deja pasar de 8 dígitos", () => {
    expect(formatearTelefono("54128890")).toBe("5412-8890");
    expect(formatearTelefono("123456789")).toBe("1234-5678");
    expect(formatearTelefono("5412")).toBe("5412");
    expect(formatearTelefono("54a1-2b8")).toBe("5412-8");
  });
});
