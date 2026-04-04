import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "manifest_session";
const SESSION_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET ?? "dev-secret-change-in-production-please";
  return new TextEncoder().encode(secret);
}

export interface SessionPayload extends JWTPayload {
  userId: string;
  email: string;
  name?: string | null;
}

export async function createSession(payload: Omit<SessionPayload, "iat" | "exp">): Promise<string> {
  const secret = getJwtSecret();
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(secret);
  return token;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
}

export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Middleware helper: check session from request (can't use cookies() in middleware)
export async function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

// Alias for compatibility with existing server component code
export async function auth(): Promise<{ user: { id: string; email: string; name?: string | null } } | null> {
  const session = await getSession();
  if (!session) return null;
  return {
    user: {
      id: session.userId,
      email: session.email,
      name: session.name,
    },
  };
}
