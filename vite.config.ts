import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const GITHUB_PAGES_BASE = process.env.VITE_BASE_PATH ?? "/poi-viz/v1/";

export default defineConfig(({ command }) => ({
  base: command === "build" ? GITHUB_PAGES_BASE : "/",
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  }
}));
