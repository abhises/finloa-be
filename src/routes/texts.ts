import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../middleware/require-admin";

/**
 * Edited copy for the site pages. The defaults live in the frontend code as t("English", "Nederlands");
 * a row here replaces one or both languages for the text with that key.
 */
export const textsRouter = Router();

/** Public: { key: { en?, nl? } } for every edited text */
textsRouter.get("/", async (_req, res) => {
  const rows = await prisma.siteText.findMany();
  const data: Record<string, { en?: string; nl?: string }> = {};
  for (const r of rows) {
    const o: { en?: string; nl?: string } = {};
    if (r.en !== null) o.en = r.en;
    if (r.nl !== null) o.nl = r.nl;
    data[r.key] = o;
  }
  res.set("Cache-Control", "public, max-age=30");
  res.json({ data });
});

const KEY = z.string().regex(/^[a-z0-9]{4,20}$/, "Invalid text key");
const value = z.string().max(20_000).nullable();

/** Batch save: [{ key, en, nl }]. null for a language goes back to the default from the code. */
textsRouter.put("/", requireAdmin, async (req, res) => {
  const items = z.array(z.object({ key: KEY, en: value, nl: value })).max(2000).parse(req.body?.items);
  await prisma.$transaction(
    items.map(({ key, en, nl }) =>
      en === null && nl === null
        ? prisma.siteText.deleteMany({ where: { key } })
        : prisma.siteText.upsert({ where: { key }, update: { en, nl }, create: { key, en, nl } }),
    ),
  );
  res.json({ data: { saved: items.length } });
});
