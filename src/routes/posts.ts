import { Router } from "express";
import { z } from "zod";
import { Prisma } from "../../generated/prisma/client";
import { HttpError } from "../lib/http-error";
import { prisma } from "../lib/prisma";
import { optionalText, optionalUrl, slugify } from "../lib/slug";
import { requireAdmin } from "../middleware/require-admin";
import { parseYoutubeId } from "./videos";

export const postsRouter = Router();

type Lang = "en" | "nl";
const langOf = (v: unknown): Lang => (v === "nl" ? "nl" : "en");

type Faq = { q: string; a: string };
const relations = {
  category: { select: { slug: true, name: true, nameNl: true } },
  author: {
    select: {
      slug: true, name: true, role: true, roleNl: true, bio: true, bioNl: true,
      avatarUrl: true, linkedinUrl: true, youtubeUrl: true, websiteUrl: true,
    },
  },
} as const;
type FullPost = Prisma.PostGetPayload<{ include: typeof relations }>;

/** Dutch text when it's filled in, otherwise the English one. */
const pick = <T>(lang: Lang, en: T, nl: T | null | undefined, empty = (v: T | null | undefined) => !v) =>
  lang === "nl" && !empty(nl) ? (nl as T) : en;

/** Card fields for /blog in one language */
function card(p: FullPost, lang: Lang) {
  return {
    id: p.id,
    slug: p.slug,
    title: pick(lang, p.title, p.titleNl),
    excerpt: pick(lang, p.excerpt, p.excerptNl),
    coverImage: p.coverImage,
    readMinutes: p.readMinutes,
    youtubeId: p.youtubeId,
    featured: p.featured,
    topic: p.category ? pick(lang, p.category.name, p.category.nameNl) : "",
    categorySlug: p.category?.slug ?? null,
    publishedAt: p.publishedAt,
  };
}

/** A full article in one language (Dutch fields fall back to English one by one) */
function detail(p: FullPost, lang: Lang) {
  const a = p.author;
  const faqsNl = p.faqsNl as Faq[];
  return {
    ...card(p, lang),
    /** false when Dutch was asked for but the post has no Dutch title yet */
    translated: lang === "en" || !!p.titleNl,
    body: pick(lang, p.body, p.bodyNl),
    videoLength: p.videoLength,
    transcript: pick(lang, p.transcript, p.transcriptNl),
    faqs: pick(lang, p.faqs as Faq[], faqsNl, (v) => !v?.length),
    tags: pick(lang, p.tags, p.tagsNl, (v) => !v?.length),
    seoTitle: pick(lang, p.seoTitle, p.seoTitleNl),
    seoDescription: pick(lang, p.seoDescription, p.seoDescriptionNl),
    jsonLd: p.jsonLd,
    newsletterPopup: p.newsletterPopup,
    author: a && {
      slug: a.slug,
      name: a.name,
      role: pick(lang, a.role, a.roleNl),
      bio: pick(lang, a.bio, a.bioNl),
      avatarUrl: a.avatarUrl,
      linkedinUrl: a.linkedinUrl,
      youtubeUrl: a.youtubeUrl,
      websiteUrl: a.websiteUrl,
    },
    updatedAt: p.updatedAt,
  };
}

const live = () => ({ published: true, publishedAt: { lte: new Date() } });

const listQuery = z.object({
  lang: z.string().optional(),
  category: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

postsRouter.get("/", async (req, res) => {
  const { lang, category, limit } = listQuery.parse(req.query);
  const posts = await prisma.post.findMany({
    where: { ...live(), ...(category && { category: { slug: category } }) },
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
    take: limit,
    include: relations,
  });
  res.set("Cache-Control", "public, max-age=60");
  res.json({ data: posts.map((p) => card(p, langOf(lang))) });
});

// ---- Admin (registered before "/:slug" so "admin" is not read as a slug) ----

postsRouter.get("/admin/all", requireAdmin, async (_req, res) => {
  const posts = await prisma.post.findMany({
    orderBy: { publishedAt: "desc" },
    select: {
      id: true, slug: true, title: true, titleNl: true, youtubeId: true, coverImage: true, featured: true,
      published: true, publishedAt: true, updatedAt: true,
      category: { select: { id: true, name: true } },
      author: { select: { id: true, name: true } },
    },
  });
  res.json({ data: posts.map(({ titleNl, ...p }) => ({ ...p, hasNl: !!titleNl })) });
});

postsRouter.get("/admin/:id", requireAdmin, async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: String(req.params.id) } });
  if (!post) throw new HttpError(404, "Post not found");
  res.json({ data: post });
});

const faqs = z
  .array(z.object({ q: z.string().trim().max(300), a: z.string().trim().max(3000) }))
  .max(30)
  .default([])
  .transform((list) => list.filter((f) => f.q && f.a));
const tags = z.array(z.string().trim().min(1).max(40)).max(20).default([]);

const postSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes")
    .max(120),
  title: z.string().trim().min(1, "Title is required").max(200),
  titleNl: z.string().trim().max(200).default(""),
  excerpt: optionalText(400),
  excerptNl: optionalText(400),
  coverImage: optionalUrl(),
  readMinutes: z.coerce.number().int().min(1).max(120).optional(),
  body: z.string().max(100_000).default(""),
  bodyNl: z.string().max(100_000).default(""),
  youtube: optionalText(300),
  videoLength: optionalText(20),
  transcript: optionalText(50_000),
  transcriptNl: optionalText(50_000),
  faqs,
  faqsNl: faqs,
  tags,
  tagsNl: tags,
  seoTitle: optionalText(200),
  seoTitleNl: optionalText(200),
  seoDescription: optionalText(400),
  seoDescriptionNl: optionalText(400),
  jsonLd: optionalText(50_000).refine((v) => {
    if (!v) return true;
    try {
      JSON.parse(v);
      return true;
    } catch {
      return false;
    }
  }, "JSON-LD is not valid JSON"),
  featured: z.boolean().default(false),
  newsletterPopup: z.boolean().default(false),
  categoryId: optionalText(40),
  authorId: optionalText(40),
  /** Automation: refer to a category / author by slug instead of id */
  categorySlug: optionalText(80),
  authorSlug: optionalText(80),
  published: z.boolean().default(true),
  publishedAt: z.coerce.date().optional(),
});
type PostInput = Partial<z.infer<typeof postSchema>>;

/**
 * Partial update: Zod still fills in `.default()` values for missing keys, which would reset them,
 * so keep only the keys the client actually sent.
 */
function parsePatch(body: unknown, extra: Record<string, unknown> = {}): PostInput {
  const raw = { ...(body && typeof body === "object" ? body : {}), ...extra } as Record<string, unknown>;
  const parsed = postSchema.partial().parse(raw) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(parsed).filter(([k]) => k in raw)) as PostInput;
}

const estimateMinutes = (text: string) => Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 220));

/** Request body → Prisma data: YouTube URL → id, category/author slugs → ids. */
async function toData(input: PostInput) {
  const { youtube, categorySlug, authorSlug, ...rest } = input;
  const data: Record<string, unknown> = { ...rest };
  if (youtube !== undefined) {
    const youtubeId = youtube === null ? null : parseYoutubeId(youtube);
    if (youtube && !youtubeId) throw new HttpError(400, "Validation failed", { youtube: ["Not a valid YouTube URL or ID"] });
    data.youtubeId = youtubeId;
  }
  if (categorySlug) {
    const c = await prisma.category.findUnique({ where: { slug: categorySlug }, select: { id: true } });
    if (!c) throw new HttpError(400, "Validation failed", { categorySlug: [`No category with slug "${categorySlug}"`] });
    data.categoryId = c.id;
  }
  if (authorSlug) {
    const a = await prisma.author.findUnique({ where: { slug: authorSlug }, select: { id: true } });
    if (!a) throw new HttpError(400, "Validation failed", { authorSlug: [`No author with slug "${authorSlug}"`] });
    data.authorId = a.id;
  }
  return data;
}

function dbError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") throw new HttpError(400, "Validation failed", { slug: ["Another post already uses this URL"] });
    if (err.code === "P2003") throw new HttpError(400, "Validation failed", { categoryId: ["Unknown category or author"] });
  }
  throw err;
}

postsRouter.post("/", requireAdmin, async (req, res) => {
  const input = postSchema.parse(req.body);
  const data = await toData(input);
  data.readMinutes ??= estimateMinutes(`${input.body} ${input.transcript ?? ""}`);
  const post = await prisma.post.create({ data: data as Prisma.PostUncheckedCreateInput }).catch(dbError);
  res.status(201).json({ data: post });
});

/** Automation: create or update by slug (idempotent). Fields left out keep their value on update. */
postsRouter.put("/by-slug/:slug", requireAdmin, async (req, res) => {
  const slug = slugify(String(req.params.slug));
  const existing = await prisma.post.findUnique({ where: { slug }, select: { id: true } });
  if (existing) {
    const data = await toData(parsePatch(req.body, { slug }));
    const post = await prisma.post.update({ where: { id: existing.id }, data }).catch(dbError);
    return res.json({ data: post, created: false });
  }
  const input = postSchema.parse({ ...req.body, slug });
  const data = await toData(input);
  data.readMinutes ??= estimateMinutes(`${input.body} ${input.transcript ?? ""}`);
  const post = await prisma.post.create({ data: data as Prisma.PostUncheckedCreateInput }).catch(dbError);
  res.status(201).json({ data: post, created: true });
});

postsRouter.patch("/:id", requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const data = await toData(parsePatch(req.body));
  const exists = await prisma.post.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new HttpError(404, "Post not found");
  const post = await prisma.post.update({ where: { id }, data }).catch(dbError);
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
    where: { slug: String(req.params.slug), ...live() },
    include: relations,
  });
  if (!post) throw new HttpError(404, "Post not found");
  res.set("Cache-Control", "public, max-age=60");
  res.json({ data: detail(post, langOf(req.query.lang)) });
});
