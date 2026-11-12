import { Router } from "express";
import { z } from "zod";
import { Prisma } from "../../generated/prisma/client";
import { HttpError } from "../lib/http-error";
import { prisma } from "../lib/prisma";
import { optionalText, optionalUrl, slugify } from "../lib/slug";
import { requireAdmin } from "../middleware/require-admin";

function slugTaken(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")
    throw new HttpError(400, "Validation failed", { slug: ["This slug is already used"] });
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") throw new HttpError(404, "Not found");
  throw err;
}

/** Zod fills in defaults for missing keys even in .partial(); keep only what the client sent. */
const sent = <T extends object>(parsed: T, body: unknown): T =>
  Object.fromEntries(Object.entries(parsed).filter(([k]) => body && typeof body === "object" && k in body)) as T;

// ---------- Categories ----------

export const categoriesRouter = Router();

const categoryInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  nameNl: z.string().trim().max(80).default(""),
  slug: z.string().trim().max(80).default(""),
  intro: z.string().trim().max(1000).default(""),
  introNl: z.string().trim().max(1000).default(""),
  sortOrder: z.coerce.number().int().default(0),
});

/** Admin: with post counts */
categoriesRouter.get("/admin", requireAdmin, async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { posts: true } } },
  });
  res.json({ data: categories });
});

/** Public: categories in both languages */
categoriesRouter.get("/", async (_req, res) => {
  const categories = await prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  res.set("Cache-Control", "public, max-age=60");
  res.json({ data: categories });
});

categoriesRouter.post("/", requireAdmin, async (req, res) => {
  const d = categoryInput.parse(req.body);
  const category = await prisma.category.create({ data: { ...d, slug: slugify(d.slug || d.name) } }).catch(slugTaken);
  res.status(201).json({ data: category });
});

categoriesRouter.patch("/:id", requireAdmin, async (req, res) => {
  const d = sent(categoryInput.partial().parse(req.body), req.body);
  const data = { ...d, ...(d.slug !== undefined && { slug: slugify(d.slug || d.name || "") }) };
  if (data.slug === "") delete data.slug;
  const category = await prisma.category.update({ where: { id: String(req.params.id) }, data }).catch(slugTaken);
  res.json({ data: category });
});

categoriesRouter.delete("/:id", requireAdmin, async (req, res) => {
  await prisma.category.delete({ where: { id: String(req.params.id) } }).catch(slugTaken);
  res.status(204).end();
});

// ---------- Authors ----------

export const authorsRouter = Router();
authorsRouter.use(requireAdmin);

const authorInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  slug: z.string().trim().max(80).default(""),
  role: z.string().trim().max(120).default(""),
  roleNl: z.string().trim().max(120).default(""),
  bio: z.string().trim().max(2000).default(""),
  bioNl: z.string().trim().max(2000).default(""),
  email: optionalText(200).refine((v) => !v || z.email().safeParse(v).success, "Enter a valid email"),
  avatarUrl: optionalUrl(),
  linkedinUrl: optionalUrl(),
  youtubeUrl: optionalUrl(),
  websiteUrl: optionalUrl(),
  sortOrder: z.coerce.number().int().default(0),
});

authorsRouter.get("/", async (_req, res) => {
  const authors = await prisma.author.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { posts: true } } },
  });
  res.json({ data: authors });
});

authorsRouter.post("/", async (req, res) => {
  const d = authorInput.parse(req.body);
  const author = await prisma.author.create({ data: { ...d, slug: slugify(d.slug || d.name) } }).catch(slugTaken);
  res.status(201).json({ data: author });
});

authorsRouter.patch("/:id", async (req, res) => {
  const d = sent(authorInput.partial().parse(req.body), req.body);
  const data = { ...d, ...(d.slug !== undefined && { slug: slugify(d.slug || d.name || "") }) };
  if (data.slug === "") delete data.slug;
  const author = await prisma.author.update({ where: { id: String(req.params.id) }, data }).catch(slugTaken);
  res.json({ data: author });
});

authorsRouter.delete("/:id", async (req, res) => {
  await prisma.author.delete({ where: { id: String(req.params.id) } }).catch(slugTaken);
  res.status(204).end();
});
