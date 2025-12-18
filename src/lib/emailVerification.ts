import crypto from "crypto";

export function hashEmailVerificationToken(token: string) {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export function createEmailVerificationToken(ttlMs = 1000 * 60 * 30) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashEmailVerificationToken(token);
  const expiresAt = new Date(Date.now() + ttlMs);
  return { token, tokenHash, expiresAt };
}

export function getBaseUrl(req: Request) {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    req.headers.get("origin") ||
    new URL(req.url).origin
  );
}
