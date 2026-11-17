import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// O frontend chama /api/... e o Vite repassa para o backend (porta 3001).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": "http://localhost:3001",
      "/banco-simulado/api": "http://localhost:3001",
    },
  },
});
