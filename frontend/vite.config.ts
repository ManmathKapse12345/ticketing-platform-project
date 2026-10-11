import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

// `npm run dev:phone` serves HTTPS on the local network, because phones only
// allow camera access (for the ticket scanner) over HTTPS.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), mode === "phone" && basicSsl()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:5000", changeOrigin: true },
    },
  },
}));
