import { createHmac, timingSafeEqual } from "crypto";

const STATE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getSecret(): string {
  return process.env.AUTH_SECRET ?? "dev-secret-change-in-production-please";
}

/**
 * Creates a signed OAuth state token embedding the workspaceId.
 * Format: base64url(JSON{workspaceId,ts}).HMAC-SHA256
 */
export function signOAuthState(workspaceId: string): string {
  const payload = Buffer.from(JSON.stringify({ workspaceId, ts: Date.now() })).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

/**
 * Verifies a signed OAuth state token and returns the embedded workspaceId,
 * or null if the signature is invalid or the token is expired.
 */
export function verifyOAuthState(state: string): string | null {
  const dotIndex = state.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const payload = state.slice(0, dotIndex);
  const sig = state.slice(dotIndex + 1);

  const expected = createHmac("sha256", getSecret()).update(payload).digest("hex");

  // Timing-safe comparison
  const sigBuf = Buffer.from(sig, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const { workspaceId, ts } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof workspaceId !== "string" || typeof ts !== "number") return null;
    if (Date.now() - ts > STATE_TTL_MS) return null;
    return workspaceId;
  } catch {
    return null;
  }
}
