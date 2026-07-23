import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    rollupOptions: {
      output: {
        // Split the big third-party libraries into their own long-lived
        // chunks so they cache across deploys (app code changes far more
        // often than pdf.js / React), and the initial bundle isn't one
        // monolith. pdf-lib and tesseract.js are already lazy-loaded, so
        // they stay out of the initial graph on their own.
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("pdfjs-dist")) return "pdfjs";
            if (id.includes("react") || id.includes("scheduler")) return "react";
          }
        },
      },
    },
  },
});
