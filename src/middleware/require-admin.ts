import type { RequestHandler } from "express";
import { safeEqual, verifyToken } from "../lib/auth";
import { env } from "../lib/env";
import { HttpError } from "../lib/http-error";

/** Admin access: either the static `x-admin-key` header or a dashboard session (`Authorization: Bearer <token>`). */
export const requireAdmin: RequestHandler = (req, res, next) => {
  const key = req.header("x-admin-key");
  if (key && safeEqual(key, env.ADMIN_API_KEY)) {
    res.locals.admin = "api-key";
    return next();
  }
  const auth = req.header("authorization") ?? "";
  const email = auth.startsWith("Bearer ") ? verifyToken(auth.slice(7).trim()) : null;
  if (!email) throw new HttpError(401, "Unauthorized");
  res.locals.admin = email;
  next();
};
