import { Router } from "express";
import { prisma } from "../lib/prisma";
import { storage } from "../lib/storage";
import { requireAdmin } from "../middleware/require-admin";

export const statsRouter = Router();

/** Counts and recent activity for the admin dashboard. */
statsRouter.get("/", requireAdmin, async (_req, res) => {
  const [posts, drafts, untranslated, videos, newLeads, leads, subscribers, media, categories, authors, texts, recentPosts, recentLeads, recentSubscribers] =
    await prisma.$transaction([
      prisma.post.count({ where: { published: true } }),
      prisma.post.count({ where: { published: false } }),
      prisma.post.count({ where: { titleNl: "" } }),
      prisma.video.count({ where: { active: true } }),
      prisma.lead.count({ where: { status: "NEW" } }),
      prisma.lead.count(),
      prisma.subscriber.count(),
      prisma.media.count(),
      prisma.category.count(),
      prisma.author.count(),
      prisma.siteText.count(),
      prisma.post.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, title: true, slug: true, published: true, youtubeId: true, titleNl: true, updatedAt: true },
      }),
      prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, firstName: true, lastName: true, email: true, source: true, status: true, createdAt: true },
      }),
      prisma.subscriber.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    ]);
  res.json({
    data: {
      counts: { posts, drafts, untranslated, videos, newLeads, leads, subscribers, media, categories, authors, texts },
      recentPosts: recentPosts.map(({ titleNl, ...p }) => ({ ...p, hasNl: !!titleNl })),
      recentLeads,
      recentSubscribers,
      storage: storage.name,
    },
  });
});
