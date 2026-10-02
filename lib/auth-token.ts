import crypto from "node:crypto";

export const SESSION_COOKIE_NAME = "session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export type SessionRole = "admin" | "viewer";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return secret;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function createSessionToken(role: SessionRole): { token: string; expiresAt: Date } {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const payload = Buffer.from(JSON.stringify({ role, exp: expiresAt.getTime() })).toString("base64url");
  const signature = sign(payload);
  return { token: `${payload}.${signature}`, expiresAt };
}

export function verifySessionToken(token: string | undefined | null): { role: SessionRole } | null {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return null;
  }

  try {
    const { role, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if ((role !== "admin" && role !== "viewer") || typeof exp !== "number" || exp <= Date.now()) {
      return null;
    }
    return { role };
  } catch {
    return null;
  }
}
