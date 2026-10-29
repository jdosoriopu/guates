import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
const api = `http://127.0.0.1:${process.env.STORE_SERVER_PORT || 8710}`;
export default defineConfig({
  server: {
    fs: { allow: [fileURLToPath(new URL("../..", import.meta.url))] },
    proxy: { "/api": api },
  },
});
