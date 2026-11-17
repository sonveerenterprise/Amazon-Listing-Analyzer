import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // *.tmp.test.ts files are one-off checks that call Claude; they only run when named explicitly.
    exclude: ["node_modules/**", ".next/**", ...(process.env.RUN_TMP_TESTS ? [] : ["**/*.tmp.test.ts"])],
  },
});
