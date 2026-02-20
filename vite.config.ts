import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: () => "index.js"
    },
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
    target: "es2022"
  }
});
