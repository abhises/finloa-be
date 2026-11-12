import { randomBytes } from "node:crypto";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { HttpError } from "../lib/http-error";
import { prisma } from "../lib/prisma";
import { slugify } from "../lib/slug";
import { storage } from "../lib/storage";
import { requireAdmin } from "../middleware/require-admin";

/** Media library: uploads go to the server disk (development) or S3 (STORAGE_DRIVER=s3). Admin only. */
export const mediaRouter = Router();
mediaRouter.use(requireAdmin);

const MAX = 15 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/svg+xml": ".svg",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "application/pdf": ".pdf",
};
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX } });

async function save(body: Buffer, originalName: string, mimeType: string, alt = "") {
  const ext = EXT[mimeType];
  if (!ext) throw new HttpError(415, `Unsupported file type ${mimeType || "(unknown)"}`);
  const d = new Date();
  const base = slugify(path.parse(originalName).name).slice(0, 60) || "file";
  const key = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${base}-${randomBytes(4).toString("hex")}${ext}`;
  const url = await storage.put(key, body, mimeType);
  return prisma.media.create({
    data: { key, url, filename: originalName, mimeType, size: body.length, alt, driver: storage.name },
  });
}

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(48),
  q: z.string().trim().max(100).optional(),
});

mediaRouter.get("/", async (req, res) => {
  const { page, pageSize, q } = listQuery.parse(req.query);
  const where = q
    ? { OR: [{ filename: { contains: q, mode: "insensitive" as const } }, { alt: { contains: q, mode: "insensitive" as const } }] }
    : {};
  const [media, total] = await prisma.$transaction([
    prisma.media.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.media.count({ where }),
  ]);
  res.json({ data: media, page, pageSize, total, storage: storage.name });
});

/** multipart/form-data with a "file" field (and optional "alt") */
mediaRouter.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Send the file in a "file" form field');
  const media = await save(req.file.buffer, req.file.originalname, req.file.mimetype, String(req.body?.alt ?? ""));
  res.status(201).json({ data: media });
});

/** JSON { url, alt? }: download a remote file and store it (handy for automation). */
mediaRouter.post("/import", async (req, res) => {
  const { url, alt } = z.object({ url: z.url({ protocol: /^https?$/ }), alt: z.string().max(300).optional() }).parse(req.body);
  const r = await fetch(url, { signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!r?.ok) throw new HttpError(400, `Could not download the file${r ? ` (${r.status})` : ""}`);
  const type = (r.headers.get("content-type") ?? "").split(";")[0].trim();
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX) throw new HttpError(413, "File too large (max 15 MB)");
  const name = path.basename(new URL(url).pathname) || "image";
  res.status(201).json({ data: await save(buf, name, type, alt) });
});

mediaRouter.patch("/:id", async (req, res) => {
  const { alt } = z.object({ alt: z.string().max(300) }).parse(req.body);
  const exists = await prisma.media.findUnique({ where: { id: String(req.params.id) }, select: { id: true } });
  if (!exists) throw new HttpError(404, "File not found");
  res.json({ data: await prisma.media.update({ where: { id: exists.id }, data: { alt } }) });
});

mediaRouter.delete("/:id", async (req, res) => {
  const media = await prisma.media.findUnique({ where: { id: String(req.params.id) } });
  if (!media) throw new HttpError(404, "File not found");
  // Files uploaded under another driver (e.g. local before switching to S3) are left where they are
  if (media.driver === storage.name) await storage.remove(media.key);
  await prisma.media.delete({ where: { id: media.id } });
  res.status(204).end();
});
