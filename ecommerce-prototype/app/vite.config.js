import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
const api = `http://127.0.0.1:${process.env.STORE_SERVER_PORT || 8710}`;

// In dev, /equipo and its deep links (/equipo/pedidos/WEB-1001) get the dashboard page, like the server does in production.
const equipoPages = {
  name: "equipo-pages",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.method === "GET" && /^\/equipo(\/[^.]*)?\/?(\?.*)?$/.test(req.url)) req.url = "/equipo.html";
      next();
    });
  },
};

export default defineConfig({
  plugins: [equipoPages],
  server: {
    fs: { allow: [fileURLToPath(new URL("../..", import.meta.url))] },
    proxy: { "/api": api },
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("index.html", import.meta.url)),
        equipo: fileURLToPath(new URL("equipo.html", import.meta.url)),
      },
    },
  },
});
