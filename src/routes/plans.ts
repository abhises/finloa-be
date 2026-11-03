import { Router } from "express";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/http-error";

export const plansRouter = Router();

const publicFields = {
  id: true,
  slug: true,
  name: true,
  tagline: true,
  priceCents: true,
  description: true,
  ctaLabel: true,
  longVideos: true,
  shorts: true,
  featuresIntro: true,
  features: true,
  popular: true,
  highlighted: true,
} as const;

plansRouter.get("/", async (_req, res) => {
  const plans = await prisma.plan.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: publicFields,
  });
  res.set("Cache-Control", "public, max-age=60");
  res.json({ data: plans });
});

plansRouter.get("/:slug", async (req, res) => {
  const plan = await prisma.plan.findFirst({
    where: { slug: req.params.slug, active: true },
    select: publicFields,
  });
  if (!plan) throw new HttpError(404, "Plan not found");
  res.json({ data: plan });
});
