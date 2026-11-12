import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  ADMIN_API_KEY: z.string().min(16, "ADMIN_API_KEY must be at least 16 characters"),
  /** Login for the /admin dashboard. Sign-in is disabled until both are set. */
  ADMIN_EMAIL: z.string().trim().optional(),
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD must be at least 8 characters").optional(),
  /** Signs admin session tokens. Defaults to a key derived from ADMIN_API_KEY. */
  AUTH_SECRET: z.string().min(16).optional(),
  /** Where media uploads go: "local" (UPLOAD_DIR, served at /api/uploads) or "s3". Defaults to local. */
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  UPLOAD_DIR: z.string().default("uploads"),
  /** Public origin of the API, used to build local upload URLs (e.g. https://finloa.com) */
  PUBLIC_URL: z.string().default("http://localhost:4000"),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default("eu-central-1"),
  /** Optional CDN / bucket URL in front of the uploads */
  S3_PUBLIC_URL: z.string().optional(),
  S3_PREFIX: z.string().default("uploads/"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = {
  ...parsed.data,
  publicUrl: parsed.data.PUBLIC_URL.replace(/\/+$/, ""),
  s3: {
    bucket: parsed.data.S3_BUCKET,
    region: parsed.data.S3_REGION,
    publicUrl: parsed.data.S3_PUBLIC_URL?.replace(/\/+$/, ""),
    prefix: parsed.data.S3_PREFIX,
  },
  corsOrigins: parsed.data.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean),
};
