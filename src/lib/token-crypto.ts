import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const SALT = "manifest-token-encryption-v1"; // fixed salt — key is derived, not used raw

function getEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return Buffer.alloc(32, 0); // zero key in dev — tokens stored plaintext-equivalent
  // Derive a 32-byte key from the env var using scrypt
  return scryptSync(raw, SALT, 32) as Buffer;
}

/**
 * Encrypts a plaintext token for storage.
 * Returns a hex string: iv(24) + authTag(32) + ciphertext(variable), all hex-encoded.
 * If ENCRYPTION_KEY is not set, returns the plaintext prefixed with "plain:" for
 * backward-compat identification.
 */
export function encryptToken(plaintext: string): string {
  if (!process.env.ENCRYPTION_KEY) return `plain:${plaintext}`;
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `enc:${iv.toString("hex")}.${authTag.toString("hex")}.${encrypted.toString("hex")}`;
}

/**
 * Decrypts a stored token. Handles both encrypted ("enc:") and plaintext ("plain:") prefixes.
 * Throws if the ciphertext is tampered with.
 */
export function decryptToken(stored: string): string {
  if (stored.startsWith("plain:")) return stored.slice(6);
  if (!stored.startsWith("enc:")) {
    // Legacy: token stored before encryption was introduced — treat as plaintext
    return stored;
  }
  const parts = stored.slice(4).split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted token format");
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}
