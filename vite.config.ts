import { resolve } from "node:path";
import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

// Three entry points: the popup page, the manager page (a full tab, also the
// options page) and the background service worker. Entry files keep their
// names because manifest.json refers to them; shared code goes to chunks/.
export default defineConfig({
  plugins: [preact()],
  resolve: { alias: { "@": resolve(import.meta.dirname, "src") } },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "chrome116",
    minify: true,
    sourcemap: false,
    modulePreload: false,
    rollupOptions: {
      input: {
        popup: resolve(import.meta.dirname, "popup.html"),
        manager: resolve(import.meta.dirname, "manager.html"),
        background: resolve(import.meta.dirname, "src/background/index.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
