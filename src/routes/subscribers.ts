import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../middleware/require-admin";
import { rateLimit } from "../middleware/rate-limit";

export const subscribersRouter = Router();

const createSchema = z.object({
  email: z.email("Enter a valid email").max(200).transform((e) => e.toLowerCase()),
  source: z.string().trim().regex(/^[a-z0-9-]{1,40}$/).default("blog"),
});

subscribersRouter.post("/", rateLimit({ windowMs: 15 * 60_000, max: 10 }), async (req, res) => {
  const { email, source } = createSchema.parse(req.body);
  // Idempotent: subscribing twice is not an error, and doesn't reveal whether the email existed
  await prisma.subscriber.upsert({ where: { email }, update: {}, create: { email, source } });
  res.status(201).json({ data: { subscribed: true } });
});

subscribersRouter.get("/", requireAdmin, async (_req, res) => {
  const subscribers = await prisma.subscriber.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ data: subscribers });
});
