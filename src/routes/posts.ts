import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export const postsRouter = Router();

const query = z.object({
  topic: z.string().trim().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

postsRouter.get("/", async (req, res) => {
  const { topic, limit } = query.parse(req.query);
  const posts = await prisma.post.findMany({
    where: { published: true, ...(topic && { topic }) },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: {
      id: true,
      slug: true,
      title: true,
      topic: true,
      excerpt: true,
      coverImage: true,
      readMinutes: true,
      publishedAt: true,
    },
  });
  res.set("Cache-Control", "public, max-age=60");
  res.json({ data: posts });
});
