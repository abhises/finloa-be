/**
 * Light clean-up for rich-text fields. Only admins write content, and they can already edit raw HTML, so this is
 * not a security boundary; it stops pasted scripts, inline event handlers and javascript: links from slipping in.
 */
export function cleanRichText(html: string): string {
  return String(html ?? "")
    .replace(/<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed)\b[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["']?)\s*javascript:[^"'\s>]*\2/gi, '$1="#"');
}

/** Links to other sites open in a new tab; links to finloa.com and /paths are left alone. */
export function markOutboundLinks(html: string): string {
  return html.replace(/<a\b([^>]*\bhref\s*=\s*["']https?:\/\/[^"']+["'][^>]*)>/gi, (m, attrs: string) =>
    /\btarget=/.test(attrs) || /finloa\.com/i.test(attrs) ? m : `<a${attrs} target="_blank" rel="noopener">`,
  );
}
