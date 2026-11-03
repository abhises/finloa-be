import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { env } from "../lib/env";
import { HttpError } from "../lib/http-error";

const expected = Buffer.from(env.ADMIN_API_KEY);

export const requireAdmin: RequestHandler = (req, _res, next) => {
  const provided = Buffer.from(req.header("x-admin-key") ?? "");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new HttpError(401, "Unauthorized");
  }
  next();
};
