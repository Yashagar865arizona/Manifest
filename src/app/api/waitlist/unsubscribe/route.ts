import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const entry = await db.waitlistEntry.findUnique({
    where: { unsubscribeToken: token },
  });

  if (!entry) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  if (!entry.unsubscribedAt) {
    await db.waitlistEntry.update({
      where: { id: entry.id },
      data: {
        unsubscribedAt: new Date(),
        nextEmailAt: null,
      },
    });
  }

  // Redirect to a simple confirmation page (or return HTML directly)
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unsubscribed — Radar</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 80px auto; padding: 0 20px; color: #111; text-align: center;">
  <p style="font-size: 22px; font-weight: 600; margin: 0 0 12px;">You're unsubscribed.</p>
  <p style="font-size: 15px; color: #555; margin: 0;">You won't receive any more emails from us. If you change your mind, sign up again at <a href="/" style="color: #111;">usemanifest.app</a>.</p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
