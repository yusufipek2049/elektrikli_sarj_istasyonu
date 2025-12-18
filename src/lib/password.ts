import bcrypt from "bcryptjs";
import crypto from "crypto";

function isBcryptHash(value: string) {
  return value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$");
}

function isHexHash(value: string) {
  // Handles 32/40/64 char hex (md5/sha1/sha256) optionally with 0x prefix
  const hex = value.startsWith("0x") ? value.slice(2) : value;
  return /^[a-fA-F0-9]{32,64}$/.test(hex);
}

function hashSha256(text: string) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

export async function verifyAndMaybeUpgrade(stored: string, incoming: string) {
  if (isBcryptHash(stored)) {
    const ok = await bcrypt.compare(incoming, stored);
    return { ok, upgradedHash: null as string | null };
  }

  if (isHexHash(stored)) {
    const normalized = stored.startsWith("0x") ? stored.slice(2) : stored;
    const incomingHash = hashSha256(incoming);
    if (normalized.toLowerCase() !== incomingHash.toLowerCase()) {
      return { ok: false, upgradedHash: null };
    }
    const upgradedHash = await bcrypt.hash(incoming, 12);
    return { ok: true, upgradedHash };
  }

  const ok = stored === incoming;
  if (!ok) return { ok: false, upgradedHash: null };

  const upgradedHash = await bcrypt.hash(incoming, 12);
  return { ok: true, upgradedHash };
}
