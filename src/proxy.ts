import { type NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/check-in",
  "/invite",
  "/api/auth",
  "/api/check-ins",
  "/api/invite",
  "/api/waitlist",
  "/_next",
  "/favicon.ico",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow root landing page
  if (pathname === "/") return NextResponse.next();

  // Allow public paths
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // Check session
  const session = await getSessionFromRequest(request);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
