import { Router } from "express";
import { z } from "zod";
import { LeadStatus, Platform } from "../../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/http-error";
import { requireAdmin } from "../middleware/require-admin";
import { rateLimit } from "../middleware/rate-limit";

export const leadsRouter = Router();

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const createLeadSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.email("Enter a valid email").max(200),
  company: optionalText(160),
  website: optionalText(300),
  videosPerMonth: optionalText(60),
  platforms: z.array(z.enum(Platform)).max(5).default([]),
  planSlug: optionalText(60),
  message: optionalText(4000),
  source: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{1,40}$/, "Invalid source")
    .default("video-creation"),
  // Honeypot: real users never see or fill this field
  companyFax: z.string().optional(),
});

leadsRouter.post("/", rateLimit({ windowMs: 15 * 60_000, max: 10 }), async (req, res) => {
  const { planSlug, companyFax, ...input } = createLeadSchema.parse(req.body);

  if (companyFax) {
    // Pretend success to bots
    res.status(201).json({ data: { id: "ok" } });
    return;
  }

  let planId: string | undefined;
  if (planSlug) {
    const plan = await prisma.plan.findUnique({ where: { slug: planSlug }, select: { id: true } });
    if (!plan) throw new HttpError(400, "Validation failed", { planSlug: ["Unknown plan"] });
    planId = plan.id;
  }

  const lead = await prisma.lead.create({
    data: { ...input, planId },
    select: { id: true, createdAt: true },
  });
  res.status(201).json({ data: lead });
});

// ---- Admin ----

const listQuery = z.object({
  status: z.enum(LeadStatus).optional(),
  source: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

leadsRouter.get("/", requireAdmin, async (req, res) => {
  const { status, source, page, pageSize } = listQuery.parse(req.query);
  const where = { ...(status && { status }), ...(source && { source }) };
  const [total, leads] = await prisma.$transaction([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { plan: { select: { slug: true, name: true } } },
    }),
  ]);
  res.json({ data: leads, meta: { total, page, pageSize } });
});

const updateLeadSchema = z.object({ status: z.enum(LeadStatus) });

leadsRouter.patch("/:id", requireAdmin, async (req, res) => {
  const { status } = updateLeadSchema.parse(req.body);
  const id = String(req.params.id);
  const exists = await prisma.lead.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new HttpError(404, "Lead not found");
  const lead = await prisma.lead.update({ where: { id }, data: { status } });
  res.json({ data: lead });
});
