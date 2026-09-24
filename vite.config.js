import { resolve } from "node:path";
import { defineConfig } from "vite";
import { apiDevPlugin } from "./vite.api.js";

export default defineConfig({
  plugins: [apiDevPlugin()],
  server: {
    port: 5173,
    host: "0.0.0.0",
  },
  preview: {
    port: 4173,
    host: "0.0.0.0",
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve("index.html"),
        admin: resolve("admin/index.html"),
      },
    },
  },
});
