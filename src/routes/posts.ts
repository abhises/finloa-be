import { Router } from "express";
import { z } from "zod";
import { Prisma } from "../../generated/prisma/client";
import { HttpError } from "../lib/http-error";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../middleware/require-admin";
import { parseYoutubeId } from "./videos";

export const postsRouter = Router();

const listSelect = {
  id: true,
  slug: true,
  title: true,
  topic: true,
  excerpt: true,
  coverImage: true,
  readMinutes: true,
  youtubeId: true,
  publishedAt: true,
} as const;

const query = z.object({
  topic: z.string().trim().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

postsRouter.get("/", async (req, res) => {
  const { topic, limit } = query.parse(req.query);
  const posts = await prisma.post.findMany({
    where: { published: true, publishedAt: { lte: new Date() }, ...(topic && { topic }) },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: listSelect,
  });
  res.set("Cache-Control", "public, max-age=60");
  res.json({ data: posts });
});

// ---- Admin (registered before "/:slug" so "admin" is not read as a slug) ----

postsRouter.get("/admin/all", requireAdmin, async (_req, res) => {
  const posts = await prisma.post.findMany({
    orderBy: { publishedAt: "desc" },
    select: { ...listSelect, published: true, updatedAt: true },
  });
  res.json({ data: posts });
});

postsRouter.get("/admin/:id", requireAdmin, async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: String(req.params.id) } });
  if (!post) throw new HttpError(404, "Post not found");
  res.json({ data: post });
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const postSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes")
    .max(120),
  title: z.string().trim().min(1, "Title is required").max(200),
  topic: z.string().trim().min(1, "Topic is required").max(60),
  excerpt: optionalText(400),
  coverImage: optionalText(500).refine((v) => !v || /^(https:\/\/|\/)/.test(v), "Use an https:// URL or a /path"),
  readMinutes: z.coerce.number().int().min(1).max(120),
  body: z.string().max(100_000).default(""),
  youtube: optionalText(300),
  videoLength: optionalText(20),
  transcript: optionalText(50_000),
  faqs: z
    .array(z.object({ q: z.string().trim().min(1).max(300), a: z.string().trim().min(1).max(3000) }))
    .max(30)
    .default([]),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  authorName: optionalText(80),
  authorRole: optionalText(120),
  authorBio: optionalText(600),
  published: z.boolean().default(true),
  publishedAt: z.coerce.date().optional(),
});

/** Swaps the `youtube` URL field for the parsed `youtubeId` column. */
function toData<T extends { youtube?: string | null }>(input: T): Omit<T, "youtube"> & { youtubeId?: string | null } {
  const { youtube, ...rest } = input;
  if (youtube === undefined) return rest;
  if (youtube === null) return { ...rest, youtubeId: null };
  const youtubeId = parseYoutubeId(youtube);
  if (!youtubeId) throw new HttpError(400, "Validation failed", { youtube: ["Not a valid YouTube URL or ID"] });
  return { ...rest, youtubeId };
}

function slugTaken(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")
    throw new HttpError(400, "Validation failed", { slug: ["Another post already uses this URL"] });
  throw err;
}

postsRouter.post("/", requireAdmin, async (req, res) => {
  const data = toData(postSchema.parse(req.body));
  const post = await prisma.post.create({ data }).catch(slugTaken);
  res.status(201).json({ data: post });
});

postsRouter.patch("/:id", requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const data = toData(postSchema.partial().parse(req.body));
  const exists = await prisma.post.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new HttpError(404, "Post not found");
  const post = await prisma.post.update({ where: { id }, data }).catch(slugTaken);
  res.json({ data: post });
});

postsRouter.delete("/:id", requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const exists = await prisma.post.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new HttpError(404, "Post not found");
  await prisma.post.delete({ where: { id } });
  res.status(204).end();
});

// ---- Public single post ----

postsRouter.get("/:slug", async (req, res) => {
  const post = await prisma.post.findFirst({
    where: { slug: String(req.params.slug), published: true, publishedAt: { lte: new Date() } },
    omit: { published: true },
  });
  if (!post) throw new HttpError(404, "Post not found");
  res.set("Cache-Control", "public, max-age=60");
  res.json({ data: post });
});
