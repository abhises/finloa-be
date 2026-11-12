import { Marked, type Tokens } from "marked";

export type TocItem = { id: string; text: string };

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z#0-9]+;/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";

const SAFE_URL = /^(https?:\/\/|mailto:|\/|#)/i;

/**
 * Renders an article body written in Markdown. Raw HTML is escaped (not rendered), links are limited to
 * http(s), mailto and site-relative URLs, and every "## heading" gets an id for the table of contents.
 */
export function renderMarkdown(markdown: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const used = new Set<string>();

  const md = new Marked({ gfm: true, breaks: false });
  md.use({
    renderer: {
      html(token: Tokens.HTML | Tokens.Tag) {
        return escapeHtml(token.text);
      },
      heading(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, token: Tokens.Heading) {
        const text = this.parser.parseInline(token.tokens);
        const level = Math.min(Math.max(token.depth, 2), 4);
        if (level !== 2) return `<h${level}>${text}</h${level}>\n`;
        let id = slug(text);
        while (used.has(id)) id += "-2";
        used.add(id);
        toc.push({ id, text: text.replace(/<[^>]+>/g, "") });
        return `<h2 id="${id}">${text}</h2>\n`;
      },
      link(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, token: Tokens.Link) {
        const text = this.parser.parseInline(token.tokens);
        if (!SAFE_URL.test(token.href)) return text;
        const external = /^https?:\/\//i.test(token.href) && !/^https?:\/\/(www\.)?finloa\.com/i.test(token.href);
        const title = token.title ? ` title="${escapeHtml(token.title)}"` : "";
        return `<a href="${escapeHtml(token.href)}"${title}${external ? ' target="_blank" rel="noopener"' : ""}>${text}</a>`;
      },
      image(token: Tokens.Image) {
        // https, site-relative, or the local API in development (media uploads)
        if (!/^(https:\/\/|\/|http:\/\/localhost[:/])/i.test(token.href)) return escapeHtml(token.text);
        return `<img src="${escapeHtml(token.href)}" alt="${escapeHtml(token.text)}" loading="lazy">`;
      },
    },
  });

  const html = md
    .parse(markdown ?? "", { async: false })
    // Two or more "### Title + paragraph" pairs in a row become a grid of cards
    .replace(/(?:<h3>[\s\S]*?<\/h3>\s*<p>[\s\S]*?<\/p>\s*){2,}/g, (run) => {
      const cards = run.match(/<h3>[\s\S]*?<\/h3>\s*<p>[\s\S]*?<\/p>/g) ?? [];
      return `<div class="post-cards">${cards.map((c) => `<div class="post-card">${c}</div>`).join("")}</div>\n`;
    })
    // "> — Name, role" as the last line of a quote becomes its attribution
    .replace(/<p>(—|--)\s*([\s\S]*?)<\/p>\s*<\/blockquote>/g, "<footer>— $2</footer></blockquote>");
  return { html, toc };
}
