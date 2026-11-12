import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./lib/env";
import { uploadRoot } from "./lib/storage/local";
import { prisma } from "./lib/prisma";
import { errorHandler, notFound } from "./middleware/error-handler";
import { authRouter } from "./routes/auth";
import { leadsRouter } from "./routes/leads";
import { mediaRouter } from "./routes/media";
import { plansRouter } from "./routes/plans";
import { postsRouter } from "./routes/posts";
import { statsRouter } from "./routes/stats";
import { subscribersRouter } from "./routes/subscribers";
import { authorsRouter, categoriesRouter } from "./routes/taxonomy";
import { textsRouter } from "./routes/texts";
import { videosRouter } from "./routes/videos";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins }));
  app.use(express.json({ limit: "2mb" }));

  // Media uploaded with STORAGE_DRIVER=local. Under /api so Caddy already routes it to this service.
  app.use(
    "/api/uploads",
    (_req, res, next) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Content-Security-Policy", "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox");
      next();
    },
    express.static(uploadRoot, { immutable: true, maxAge: "365d", index: false, dotfiles: "ignore", fallthrough: false }),
  );

  app.get("/api/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok", db: "up" });
    } catch {
      res.status(503).json({ status: "degraded", db: "down" });
    }
  });

  app.use("/api/auth", authRouter);
  app.use("/api/stats", statsRouter);
  app.use("/api/plans", plansRouter);
  app.use("/api/leads", leadsRouter);
  app.use("/api/posts", postsRouter);
  app.use("/api/subscribers", subscribersRouter);
  app.use("/api/videos", videosRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/authors", authorsRouter);
  app.use("/api/media", mediaRouter);
  app.use("/api/texts", textsRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
