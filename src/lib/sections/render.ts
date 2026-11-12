import { z } from "zod";
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../prisma";
import { BUILTIN_BY_KEY } from "./builtins";
import { scopeCss } from "./css";
import { collectRefs, prepareData, type FieldDef, type Ref, type Resolved } from "./fields";
import { escapeHtml, renderTemplate } from "./template";

export const sectionItemSchema = z.object({
  id: z.string().min(1).max(40),
  type: z.string().min(1).max(80),
  data: z.record(z.string(), z.unknown()).default({}),
  hidden: z.boolean().optional(),
  /** Overrides the name of the section's heading in the contents list; "" keeps the section out of it */
  tocLabel: z.string().max(120).optional(),
});
export const sectionsDocSchema = z.object({
  /** "toc": contents list beside the article; "wide": no contents list, wider column */
  layout: z.enum(["toc", "wide"]).default("toc"),
  items: z.array(sectionItemSchema).max(200),
});
export type SectionsDoc = z.infer<typeof sectionsDocSchema>;
type TypeRow = { key: string; fields: unknown; template: string; css?: string };

/** The `post` object available in every template as {{post.title}}, {{post.author.name}} … */
export function postContext(p: {
  slug?: string;
  title?: string;
  excerpt?: string | null;
  coverImage?: string | null;
  lang?: "en" | "nl";
  category?: { name: string; nameNl?: string; slug: string } | null;
  author?: { name: string; slug: string; avatarUrl?: string | null; role?: string } | null;
}) {
  return {
    title: p.title ?? "",
    excerpt: p.excerpt ?? "",
    url: `/blog/${p.slug ?? ""}`,
    coverImage: p.coverImage ?? "",
    lang: p.lang ?? "en",
    category: p.category ? { name: p.lang === "nl" ? p.category.nameNl || p.category.name : p.category.name, url: `/blog?category=${p.category.slug}` } : null,
    author: p.author ? { name: p.author.name, avatar: p.author.avatarUrl ?? "", role: p.author.role ?? "" } : null,
  };
}

async function loadTypes(keys: string[]) {
  const rows = await prisma.sectionType.findMany({ where: { key: { in: keys } }, select: { key: true, fields: true, template: true, css: true } });
  return new Map(rows.map((r) => [r.key, r as TypeRow]));
}

async function resolveRefs(refs: Ref): Promise<Resolved> {
  const ids = [...refs.posts];
  const posts = ids.length
    ? await prisma.post.findMany({ where: { OR: [{ id: { in: ids } }, { slug: { in: ids } }] }, include: { category: true } })
    : [];
  const resolved: Resolved = { posts: new Map() };
  for (const p of posts) {
    const card = {
      id: p.id,
      title: p.title,
      titleNl: p.titleNl || p.title,
      excerpt: p.excerpt ?? "",
      url: `/blog/${p.slug}`,
      coverImage: p.coverImage ?? (p.youtubeId ? `https://i.ytimg.com/vi/${p.youtubeId}/hqdefault.jpg` : ""),
      category: p.category?.name ?? "",
      readMinutes: p.readMinutes,
    };
    resolved.posts.set(p.id, card);
    resolved.posts.set(p.slug, card);
  }
  return resolved;
}

/** Marks a section's h2 headings for the contents list: left out ("" label) or renamed. */
function tocMarks(html: string, label: string | undefined) {
  if (label === undefined) return html;
  if (label === "") return html.replace(/<h2\b/gi, '<h2 data-toc="off"');
  let first = true;
  return html.replace(/<h2\b/gi, (m) => {
    if (!first) return m;
    first = false;
    return `<h2 data-toc-label="${escapeHtml(label)}"`;
  });
}

export type RenderedSection = { id: string; type: string; html: string };

/** Renders each section on its own (also used by the admin previews). */
export async function renderItems(items: SectionsDoc["items"], post: Record<string, unknown>, extraTypes?: Map<string, TypeRow>): Promise<RenderedSection[]> {
  const visible = items.filter((s) => !s.hidden);
  const types = await loadTypes([...new Set(visible.map((s) => s.type))]);
  extraTypes?.forEach((t, k) => types.set(k, t));
  const refs: Ref = { posts: new Set() };
  for (const s of visible) {
    const t = types.get(s.type);
    if (t) collectRefs(t.fields as FieldDef[], s.data, refs);
  }
  const resolved = await resolveRefs(refs);
  return visible.map((s) => {
    const t = types.get(s.type);
    if (!t) return { id: s.id, type: s.type, html: `<!-- unknown section type "${escapeHtml(s.type)}" -->` };
    const data = prepareData(t.fields as FieldDef[], s.data, resolved);
    BUILTIN_BY_KEY.get(s.type)?.prepare?.(data, post);
    let html: string;
    try {
      html = renderTemplate(t.template, data, { post, section: { id: s.id } });
    } catch (e) {
      html = `<!-- section "${escapeHtml(s.type)}" failed: ${escapeHtml((e as Error).message)} -->`;
    }
    return { id: s.id, type: s.type, html: tocMarks(html, s.tocLabel) };
  });
}

/** Article HTML for a section-based post: every section in a wrapper the CSS and the editor preview can target. */
export async function renderDoc(doc: SectionsDoc, post: Record<string, unknown>) {
  const parts = await renderItems(doc.items, post);
  return parts.map((s) => `<div class="fl-sec fl-sec--${s.type}" data-section="${escapeHtml(s.id)}">\n${s.html}\n</div>`).join("\n");
}

/** CSS of the custom section types used by the docs, each scoped to its own sections. */
export async function sectionsCss(...docs: (SectionsDoc | null | undefined)[]) {
  const keys = [...new Set(docs.flatMap((d) => d?.items.map((s) => s.type) ?? []))];
  if (!keys.length) return "";
  const rows = await prisma.sectionType.findMany({ where: { key: { in: keys }, builtIn: false, NOT: { css: "" } }, select: { key: true, css: true } });
  return rows.map((r) => scopeCss(r.css, `.fl-sec--${r.key}`)).join("\n");
}

const docOf = (v: unknown) => {
  const r = sectionsDocSchema.safeParse(v);
  return r.success ? r.data : null;
};

/** Re-renders the stored HTML of one post from its sections (both languages). Plain HTML / Markdown posts are left alone. */
export async function rerenderPost(id: string) {
  const p = await prisma.post.findUnique({ where: { id }, include: { category: true, author: true } });
  if (!p) return;
  const data: Prisma.PostUpdateInput = {};
  const en = docOf(p.sections);
  const nl = docOf(p.sectionsNl);
  if (en) {
    const html = await renderDoc(en, postContext({ ...p, lang: "en" }));
    if (html !== p.html) data.html = html;
  }
  if (nl) {
    const html = await renderDoc(nl, postContext({ ...p, title: p.titleNl || p.title, excerpt: p.excerptNl || p.excerpt, lang: "nl" }));
    if (html !== p.htmlNl) data.htmlNl = html;
  }
  if (Object.keys(data).length) await prisma.post.update({ where: { id }, data: { ...data, updatedAt: p.updatedAt } });
}

const sectionPosts = () =>
  prisma.post.findMany({
    where: { OR: [{ NOT: { sections: { equals: Prisma.AnyNull } } }, { NOT: { sectionsNl: { equals: Prisma.AnyNull } } }] },
    select: { id: true, title: true, sections: true, sectionsNl: true },
  });
const typesIn = (r: { sections: unknown; sectionsNl: unknown }) =>
  new Set([...(docOf(r.sections)?.items ?? []), ...(docOf(r.sectionsNl)?.items ?? [])].map((s) => s.type));

/** Posts that use one of the given section types. */
export async function postsUsing(keys: string[]) {
  const rows = await sectionPosts();
  return rows.filter((r) => [...typesIn(r)].some((k) => keys.includes(k))).map((r) => ({ id: r.id, title: r.title }));
}

/** How many posts use each section type. */
export async function usageCounts() {
  const counts = new Map<string, number>();
  for (const r of await sectionPosts()) for (const key of typesIn(r)) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
}
