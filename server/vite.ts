import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      // In development, serve the generated docs instead of trying to build a React app
      const publicPath = path.resolve(import.meta.dirname, "..", "public");
      const docsTemplate = path.resolve(publicPath, "index.html");

      if (fs.existsSync(docsTemplate)) {
        const template = await fs.promises.readFile(docsTemplate, "utf-8");
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } else {
        res.status(404).send("Documentation not found. Run 'node scripts/generate-docs.js' to generate it.");
      }
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const publicPath = path.resolve(import.meta.dirname, "..", "public");

  if (!fs.existsSync(publicPath)) {
    throw new Error(
      `Could not find the public directory: ${publicPath}`,
    );
  }

  app.use(express.static(publicPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(publicPath, "index.html"));
  });
}
