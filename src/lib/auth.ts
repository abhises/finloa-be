import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/** Admin session tokens: base64url(JSON payload) + "." + HMAC-SHA256 signature. Valid for 7 days. */
const SESSION_DAYS = 7;
const secret = env.AUTH_SECRET ?? createHash("sha256").update(`finloa-admin-session:${env.ADMIN_API_KEY}`).digest("hex");

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export const loginEnabled = Boolean(env.ADMIN_EMAIL && env.ADMIN_PASSWORD);

export function checkCredentials(email: string, password: string) {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return false;
  // Evaluate both so timing does not reveal which one was wrong
  const emailOk = safeEqual(email.trim().toLowerCase(), env.ADMIN_EMAIL.toLowerCase());
  const passwordOk = safeEqual(password, env.ADMIN_PASSWORD);
  return emailOk && passwordOk;
}

const sign = (data: string) => createHmac("sha256", secret).update(data).digest("base64url");

export function signToken(email: string) {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + SESSION_DAYS * 86_400_000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Returns the signed-in email, or null for a missing, forged or expired token. */
export function verifyToken(token: string): string | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  try {
    const { email, exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { email?: unknown; exp?: unknown };
    if (typeof email !== "string" || typeof exp !== "number" || exp < Date.now()) return null;
    return email;
  } catch {
    return null;
  }
}
