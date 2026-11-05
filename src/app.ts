import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./lib/env";
import { prisma } from "./lib/prisma";
import { errorHandler, notFound } from "./middleware/error-handler";
import { authRouter } from "./routes/auth";
import { leadsRouter } from "./routes/leads";
import { plansRouter } from "./routes/plans";
import { postsRouter } from "./routes/posts";
import { statsRouter } from "./routes/stats";
import { subscribersRouter } from "./routes/subscribers";
import { videosRouter } from "./routes/videos";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins }));
  app.use(express.json({ limit: "512kb" }));

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

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
