import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exchangeGoogleCode, backfillGoogleCalendarSignals } from "@/lib/connectors/google";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const workspaceId = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/dashboard/connectors?error=google_denied", process.env.NEXT_PUBLIC_APP_URL!));
  }
  if (!code || !workspaceId) {
    return NextResponse.redirect(new URL("/dashboard/connectors?error=google_missing_params", process.env.NEXT_PUBLIC_APP_URL!));
  }

  try {
    const tokenData = await exchangeGoogleCode(code);
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    await db.connectorCredential.upsert({
      where: { workspaceId_connectorType: { workspaceId, connectorType: "GOOGLE_CALENDAR" } },
      create: {
        workspaceId,
        connectorType: "GOOGLE_CALENDAR",
        status: "ACTIVE",
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? null,
        tokenExpiresAt: expiresAt,
        scopes: tokenData.scope,
      },
      update: {
        status: "ACTIVE",
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? undefined,
        tokenExpiresAt: expiresAt,
        scopes: tokenData.scope,
      },
    });

    backfillGoogleCalendarSignals(workspaceId, 30).catch(console.error);

    return NextResponse.redirect(new URL("/dashboard/connectors?connected=google", process.env.NEXT_PUBLIC_APP_URL!));
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(new URL("/dashboard/connectors?error=google_exchange_failed", process.env.NEXT_PUBLIC_APP_URL!));
  }
}
