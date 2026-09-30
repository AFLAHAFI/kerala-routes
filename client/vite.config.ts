import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  build: { outDir: "../dist/client", emptyOutDir: true },
  server: { host: "0.0.0.0" },
  base: process.env.VITE_BASE_PATH || "./",
});
