import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;
const isProductionBuild = process.env.NODE_ENV === "production";

if (!rawPort && !isProductionBuild) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = rawPort ? Number(rawPort) : 5173;

if (rawPort && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// For Firebase Hosting builds, the app is served at the root path.
// In Replit dev, BASE_PATH is set by the artifacts system.
const basePath = process.env.BASE_PATH ?? "/";

const googleApiKey = process.env.GOOGLE_API_KEY ?? "";

export default defineConfig({
  base: basePath,
  define: {
    "import.meta.env.GOOGLE_API_KEY": JSON.stringify(googleApiKey),
  },
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      "^/(.*/)?predict$": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: () => "/predict",
      },
      "^/(.*/)?health$": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: () => "/health",
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
