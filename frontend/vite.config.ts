import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      // REST API proxy
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      // Public open-data API (Agricultural Signal API)
      "/v1": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      // WebSocket proxy for Gemini Live (local dev)
      "/gemini-live": {
        target: "ws://localhost:3000",
        ws: true,
        changeOrigin: true,
      },
      // WebSocket proxy for Voice Service (Python, local dev)
      "/voice-live": {
        target: "ws://localhost:8001",
        ws: true,
        changeOrigin: true,
      },
      // YOLO detection proxy (local dev)
      "/yolo": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/yolo/, ""),
      },
    },
  },
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
});
