import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // "server-only" falla fuera de Next.js; en las pruebas lo cambiamos por un módulo vacío.
      "server-only": fileURLToPath(new URL("./src/test/server-only.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      // La cobertura mínima se mide sobre la lógica: reglas del negocio, validaciones y la capa
      // de datos. Las pantallas las cubren las pruebas end-to-end (e2e/).
      include: ["src/lib/**", "src/schemas/**"],
      exclude: [
        "**/*.test.ts",
        // Solo corren en el navegador o dentro de Next.js; los prueban las pruebas e2e.
        "src/lib/compartir.ts",
        "src/lib/http.ts",
        "src/lib/*-pdf.ts",
        "src/lib/auth/server.ts",
        "src/lib/auth/respuestas.ts",
      ],
      reporter: ["text-summary", "html"],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
    },
  },
});
