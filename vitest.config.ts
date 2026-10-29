import { defineConfig } from "vitest/config";

// Pruebas automáticas de la lógica pura (lib/). Se lanzan con `npm test`.
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
