import fs from "node:fs";
import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(import.meta.dirname, "./package.json"), "utf8")
) as { version: string };

const basePath = process.env.BASE_PATH ?? "/";
const base = basePath.endsWith("/") ? basePath : `${basePath}/`;

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
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(packageJson.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      includeAssets: [
        "favicon.svg",
        "apple-touch-icon.png",
        "pwa-64x64.png",
        "pwa-192x192.png",
        "pwa-512x512.png",
        "pwa-maskable-512x512.png",
        "robots.txt",
      ],
      manifest: {
        background_color: "#FAFAF9",
        categories: ["education", "kids", "books"],
        description:
          "Application web d'entraînement et d'évaluation de la fluence de lecture du CE1 au CM2 (ELFE / Éduscol).",
        display: "standalone",
        icons: [
          {
            sizes: "64x64",
            src: "pwa-64x64.png",
            type: "image/png",
          },
          {
            sizes: "192x192",
            src: "pwa-192x192.png",
            type: "image/png",
          },
          {
            sizes: "512x512",
            src: "pwa-512x512.png",
            type: "image/png",
          },
          {
            purpose: "maskable",
            sizes: "512x512",
            src: "pwa-maskable-512x512.png",
            type: "image/png",
          },
        ],
        id: base,
        lang: "fr",
        name: "Fluence - Entraînement à la lecture",
        scope: base,
        short_name: "Fluence",
        start_url: base,
        theme_color: "#2563EB",
      },
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],
        runtimeCaching: [
          {
            handler: "CacheFirst",
            options: {
              cacheableResponse: {
                statuses: [0, 200],
              },
              cacheName: "google-fonts-cache",
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 365,
                maxEntries: 10,
              },
            },
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          },
          {
            handler: "CacheFirst",
            options: {
              cacheableResponse: {
                statuses: [0, 200],
              },
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 365,
                maxEntries: 20,
              },
            },
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
