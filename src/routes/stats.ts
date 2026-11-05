import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../middleware/require-admin";

export const statsRouter = Router();

/** Counts and recent activity for the admin dashboard. */
statsRouter.get("/", requireAdmin, async (_req, res) => {
  const [posts, drafts, videos, newLeads, leads, subscribers, recentPosts, recentLeads] = await prisma.$transaction([
    prisma.post.count({ where: { published: true } }),
    prisma.post.count({ where: { published: false } }),
    prisma.video.count({ where: { active: true } }),
    prisma.lead.count({ where: { status: "NEW" } }),
    prisma.lead.count(),
    prisma.subscriber.count(),
    prisma.post.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, slug: true, published: true, youtubeId: true, updatedAt: true },
    }),
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, firstName: true, lastName: true, email: true, source: true, status: true, createdAt: true },
    }),
  ]);
  res.json({ data: { counts: { posts, drafts, videos, newLeads, leads, subscribers }, recentPosts, recentLeads } });
});
