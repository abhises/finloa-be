import { Router } from "express";
import { z } from "zod";
import { VideoKind } from "../../generated/prisma/enums";
import { HttpError } from "../lib/http-error";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../middleware/require-admin";

export const NICHES = [
  "software-learning",
  "property-home",
  "health-wellness",
  "professional-services",
  "retail-ecommerce",
  "hospitality-lifestyle",
] as const;

export const videosRouter = Router();

/** Accepts a YouTube URL (watch, youtu.be, embed, shorts) or a bare 11-character ID. */
export function parseYoutubeId(input: string): string | null {
  const s = input.trim();
  const m = s.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})/) ?? s.match(/^([\w-]{11})$/);
  return m ? m[1] : null;
}

const publicSelect = { id: true, niche: true, kind: true, youtubeId: true, title: true, sortOrder: true } as const;

videosRouter.get("/", async (_req, res) => {
  const videos = await prisma.video.findMany({
    where: { active: true },
    orderBy: [{ niche: "asc" }, { kind: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    select: publicSelect,
  });
  res.set("Cache-Control", "public, max-age=60");
  res.json({ data: videos });
});

const createSchema = z.object({
  niche: z.enum(NICHES),
  kind: z.enum(VideoKind),
  youtube: z.string().trim().min(1, "YouTube URL or ID is required").max(300),
  title: z.string().trim().max(160).optional(),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
});

videosRouter.post("/", requireAdmin, async (req, res) => {
  const { youtube, ...input } = createSchema.parse(req.body);
  const youtubeId = parseYoutubeId(youtube);
  if (!youtubeId) throw new HttpError(400, "Validation failed", { youtube: ["Not a valid YouTube URL or ID"] });
  const video = await prisma.video.create({ data: { ...input, youtubeId }, select: publicSelect });
  res.status(201).json({ data: video });
});

const updateSchema = createSchema.partial().extend({ active: z.boolean().optional() });

videosRouter.patch("/:id", requireAdmin, async (req, res) => {
  const { youtube, ...input } = updateSchema.parse(req.body);
  const id = String(req.params.id);
  const exists = await prisma.video.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new HttpError(404, "Video not found");
  let youtubeId: string | undefined;
  if (youtube !== undefined) {
    youtubeId = parseYoutubeId(youtube) ?? undefined;
    if (!youtubeId) throw new HttpError(400, "Validation failed", { youtube: ["Not a valid YouTube URL or ID"] });
  }
  const video = await prisma.video.update({ where: { id }, data: { ...input, youtubeId }, select: publicSelect });
  res.json({ data: video });
});

videosRouter.delete("/:id", requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const exists = await prisma.video.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new HttpError(404, "Video not found");
  await prisma.video.delete({ where: { id } });
  res.status(204).end();
});
