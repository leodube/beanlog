import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    // Listen on all interfaces inside the container. Vite's default
    // (localhost) is unreachable through Docker's port forwarding.
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
  },
});
