import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { existsSync } from "node:fs";
import { defineConfig } from "vite";

// Inside a container, listen on all interfaces: Vite's default (localhost) is
// unreachable through Docker's port forwarding. On a normal machine, stay on
// localhost; `npm run dev -- --host` exposes the dev server to your network.
const inContainer =
  existsSync("/.dockerenv") || !!process.env.REMOTE_CONTAINERS;

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    host: inContainer ? "0.0.0.0" : "localhost",
    port: 5173,
    strictPort: true,
  },
});
