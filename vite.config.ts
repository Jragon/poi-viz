import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";
import Markdown from "unplugin-vue-markdown/vite";
import { defineConfig } from "vite";

const GITHUB_PAGES_BASE = "/poi-viz/";

export default defineConfig(({ command }) => ({
  base: command === "build" ? GITHUB_PAGES_BASE : "/",
  plugins: [vue({ include: [/\.vue$/, /\.md$/] }), Markdown(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src")
    }
  }
}));
