import fs from "fs";
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const DATA = env.VITE_CV_DATA
    ? JSON.stringify(env.VITE_CV_DATA)
    : JSON.stringify(
        fs.readFileSync("instances/default/generated/cv.default.json", "utf-8")
      );
  const CONFIG = env.VITE_CV_INSTANCE_CONFIG
    ? JSON.stringify(env.VITE_CV_INSTANCE_CONFIG)
    : JSON.stringify(fs.readFileSync("instances/default/config.json", "utf-8"));

  return {
    plugins: [
      svelte(),
      tailwindcss(),
      // dev-only endpoint that lists directories under `src/template`
      {
        name: 'templates-endpoint',
        configureServer(server) {
          server.middlewares.use('/api/templates', (req, res, next) => {
            if (req.method !== 'GET') return next();
            try {
              const templatesDir = path.resolve(process.cwd(), 'src/template');
              const list = [];
              for (const dirent of fs.readdirSync(templatesDir, { withFileTypes: true })) {
                if (dirent.isDirectory() || dirent.isSymbolicLink()) {
                  const htmlPath = path.join(templatesDir, dirent.name, 'index.html');
                  if (fs.existsSync(htmlPath)) list.push(dirent.name);
                }
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(list));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'failed to read templates' }));
            }
          });
        },
      },
    ],
    base: "./",
    resolve: {
      alias: {
        $lib: path.resolve(process.cwd(), "lib"),
        // Ensure 'tailwindcss' resolves to the project's installed package
        // This helps when templates are symlinked from outside the project
        // so PostCSS/Tailwind imports resolve to the correct node_modules.
        // tailwindcss: path.resolve(process.cwd(), "node_modules", "tailwindcss"),
      },
      preserveSymlinks: true, // Ensure symlinks are not resolved to their real paths
    },
    build: {
      outDir: "dist",
      // Also build each template's index.html as a separate HTML entry so
      // `npm run build` emits a dedicated HTML per template (e.g. `default.html`).
      rollupOptions: {
        input: (() => {
          const templatesDir = path.resolve(process.cwd(), "src/template");
          const entries: Record<string, string> = {};
          try {
            for (const name of fs.readdirSync(templatesDir, {
              withFileTypes: true,
            })) {
              if (name.isDirectory() || name.isSymbolicLink()) {
                const htmlPath = path.join(
                  templatesDir,
                  name.name,
                  "index.html"
                );
                if (fs.existsSync(htmlPath)) entries[name.name] = htmlPath;
              }
            }
          } catch (err) {
            // ignore if templates not present
          }
          return entries;
        })(),
      },
    },
    define: {
      "import.meta.env.VITE_CV_DATA": DATA,
      "import.meta.env.VITE_CV_INSTANCE_CONFIG": CONFIG,
    },
  };
});
