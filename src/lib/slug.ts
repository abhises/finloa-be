import { z } from "zod";

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

/** Trimmed optional string: "" and null become null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

/** Optional link: must be a full http(s) URL or a /path, so it can't carry javascript: */
export const optionalUrl = (max = 500) =>
  optionalText(max).refine((v) => !v || /^(https?:\/\/\S+|\/\S*)$/i.test(v), "Use a full https:// link or a /path");
