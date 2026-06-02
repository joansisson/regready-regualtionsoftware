import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Use simpler path resolution for Docker compatibility
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve("./client/src"),
      "@shared": path.resolve("./shared"),
      "@assets": path.resolve("./attached_assets"),
    },
  },
  root: "./client",
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: false,
    },
  },
});
