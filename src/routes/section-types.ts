import { Router } from "express";
import { z } from "zod";
import { Prisma } from "../../generated/prisma/client";
import { HttpError } from "../lib/http-error";
import { prisma } from "../lib/prisma";
import { scopeCss } from "../lib/sections/css";
import { fieldListSchema, type FieldDef } from "../lib/sections/fields";
import { postContext, postsUsing, renderItems, rerenderPost, usageCounts } from "../lib/sections/render";
import { checkTemplate, TemplateError } from "../lib/sections/template";
import { slugify } from "../lib/slug";
import { requireAdmin } from "../middleware/require-admin";

/** Section types: the building blocks of section-based posts. Admin only. */
export const sectionTypesRouter = Router();
sectionTypesRouter.use(requireAdmin);

const typeInput = z
  .object({
    key: z.string().max(60),
    name: z.string().trim().min(1).max(80),
    group: z.string().trim().min(1).max(40),
    description: z.string().max(300),
    fields: fieldListSchema,
    template: z.string().max(50_000),
    css: z.string().max(50_000),
    sample: z.record(z.string(), z.unknown()),
  })
  .partial();

function validateTemplate(t?: string) {
  try {
    if (t !== undefined) checkTemplate(t);
  } catch (e) {
    if (e instanceof TemplateError) throw new HttpError(400, `Template: ${e.message}`);
    throw e;
  }
}

/** Sample post used for previews when no real post is given. */
async function samplePost(postId?: string) {
  const p = postId
    ? await prisma.post.findUnique({ where: { id: postId }, include: { category: true, author: true } })
    : await prisma.post.findFirst({ where: { published: true }, include: { category: true, author: true }, orderBy: { publishedAt: "desc" } });
  return postContext(p ?? { slug: "example", title: "How to build an emergency fund", excerpt: "Example intro text for the preview." });
}

async function previewHtml(key: string, data: unknown, post: Record<string, unknown>, override?: { fields: unknown; template: string }) {
  const extra = override ? new Map([[key, { key, ...override }]]) : undefined;
  const [r] = await renderItems([{ id: "preview", type: key, data: (data ?? {}) as Record<string, unknown> }], post, extra);
  return r ? `<div class="fl-sec fl-sec--${key}">${r.html}</div>` : "";
}

sectionTypesRouter.get("/", async (req, res) => {
  const [types, counts] = await Promise.all([prisma.sectionType.findMany({ orderBy: [{ group: "asc" }, { name: "asc" }] }), usageCounts()]);
  const withPreview = req.query.preview === "1";
  const post = withPreview ? await samplePost() : {};
  const out = [];
  for (const t of types) {
    out.push({
      ...t,
      uses: counts.get(t.key) ?? 0,
      previewHtml: withPreview ? await previewHtml(t.key, t.sample, post) : undefined,
      previewCss: withPreview && t.css ? scopeCss(t.css, `.fl-sec--${t.key}`) : undefined,
    });
  }
  res.json({ data: out });
});

/**
 * Preview one section. Pass `key` + `data` for a saved type, or `type` (fields, template, css) to preview unsaved
 * changes in the type editor. Optional `postId` fills {{post.*}} with that post.
 */
sectionTypesRouter.post("/preview", async (req, res) => {
  const b = z
    .object({
      key: z.string().optional(),
      data: z.unknown().optional(),
      postId: z.string().optional(),
      type: z.object({ fields: fieldListSchema, template: z.string(), css: z.string().default("") }).optional(),
    })
    .parse(req.body);
  const key = slugify(b.key || "preview") || "preview";
  if (b.type) validateTemplate(b.type.template);
  const post = await samplePost(b.postId);
  const html = await previewHtml(key, b.data ?? {}, post, b.type && { fields: b.type.fields as FieldDef[], template: b.type.template });
  const css = b.type
    ? scopeCss(b.type.css, `.fl-sec--${key}`)
    : await prisma.sectionType.findUnique({ where: { key } }).then((t) => (t?.css ? scopeCss(t.css, `.fl-sec--${key}`) : ""));
  res.json({ html, css });
});

sectionTypesRouter.get("/:key", async (req, res) => {
  const type = await prisma.sectionType.findUnique({ where: { key: String(req.params.key) } });
  if (!type) throw new HttpError(404, "Section type not found");
  const posts = await postsUsing([type.key]);
  res.json({ data: type, usedBy: posts });
});

sectionTypesRouter.post("/", async (req, res) => {
  const d = typeInput.required({ name: true }).parse(req.body);
  validateTemplate(d.template);
  const key = slugify(d.key || d.name).slice(0, 60);
  if (!key) throw new HttpError(400, "Give the section type a name");
  if (await prisma.sectionType.findUnique({ where: { key } })) throw new HttpError(409, `A section type with the key "${key}" already exists`);
  const { fields, sample, ...rest } = d;
  const type = await prisma.sectionType.create({
    data: { ...rest, key, builtIn: false, fields: (fields ?? []) as unknown as Prisma.InputJsonValue, sample: (sample ?? {}) as Prisma.InputJsonValue },
  });
  res.status(201).json({ data: type });
});

sectionTypesRouter.patch("/:key", async (req, res) => {
  const existing = await prisma.sectionType.findUnique({ where: { key: String(req.params.key) } });
  if (!existing) throw new HttpError(404, "Section type not found");
  if (existing.builtIn) throw new HttpError(403, "Built-in section types are locked. Duplicate it to make your own version.");
  const { key: _ignored, fields, sample, ...d } = typeInput.parse(req.body);
  validateTemplate(d.template);
  const type = await prisma.sectionType.update({
    where: { key: existing.key },
    data: {
      ...d,
      version: { increment: 1 },
      fields: fields as unknown as Prisma.InputJsonValue | undefined,
      sample: sample as Prisma.InputJsonValue | undefined,
    },
  });
  const posts = await postsUsing([type.key]);
  for (const p of posts) await rerenderPost(p.id);
  res.json({ data: type, rerendered: posts.length });
});

sectionTypesRouter.post("/:key/duplicate", async (req, res) => {
  const src = await prisma.sectionType.findUnique({ where: { key: String(req.params.key) } });
  if (!src) throw new HttpError(404, "Section type not found");
  let key = `${src.key}-copy`;
  let n = 2;
  while (await prisma.sectionType.findUnique({ where: { key } })) key = `${src.key}-copy-${n++}`;
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = src;
  const type = await prisma.sectionType.create({
    data: {
      ...rest,
      key,
      name: `${src.name} (copy)`,
      builtIn: false,
      version: 1,
      fields: src.fields as Prisma.InputJsonValue,
      sample: src.sample as Prisma.InputJsonValue,
    },
  });
  res.status(201).json({ data: type });
});

sectionTypesRouter.delete("/:key", async (req, res) => {
  const type = await prisma.sectionType.findUnique({ where: { key: String(req.params.key) } });
  if (!type) throw new HttpError(404, "Section type not found");
  if (type.builtIn) throw new HttpError(403, "Built-in section types can't be deleted.");
  const posts = await postsUsing([type.key]);
  if (posts.length)
    throw new HttpError(409, `Used in ${posts.length} ${posts.length === 1 ? "post" : "posts"}: ${posts.slice(0, 5).map((p) => p.title).join(", ")}. Remove it there first.`);
  await prisma.sectionType.delete({ where: { key: type.key } });
  res.status(204).end();
});
