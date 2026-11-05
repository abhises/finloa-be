import { Router } from "express";
import { z } from "zod";
import { checkCredentials, loginEnabled, signToken } from "../lib/auth";
import { HttpError } from "../lib/http-error";
import { requireAdmin } from "../middleware/require-admin";
import { rateLimit } from "../middleware/rate-limit";

export const authRouter = Router();

const loginSchema = z.object({ email: z.string().max(200), password: z.string().max(200) });

authRouter.post("/login", rateLimit({ windowMs: 15 * 60_000, max: 20 }), (req, res) => {
  if (!loginEnabled) throw new HttpError(503, "Admin sign-in is not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD.");
  const { email, password } = loginSchema.parse(req.body);
  if (!checkCredentials(email, password)) throw new HttpError(401, "Invalid email or password");
  res.json({ token: signToken(email.trim().toLowerCase()), email });
});

authRouter.get("/me", requireAdmin, (_req, res) => {
  res.json({ data: { email: res.locals.admin } });
});
