import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const basePath = process.env.BASE_PATH;
const base =
  basePath === undefined
    ? process.env.GITHUB_ACTIONS
      ? "/fluence/"
      : "/"
    : basePath.endsWith("/")
      ? basePath
      : `${basePath}/`;

// https://vite.dev/config/
export default defineConfig({
  base,
  build: {
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "vendor",
              test: /node_modules[\\/]react(?:-dom)?[\\/]/u,
            },
            {
              name: "dexie",
              test: /node_modules[\\/]dexie(?:-react-hooks)?[\\/]/u,
            },
          ],
        },
      },
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
