import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exchangeSlackCode, backfillSlackSignals } from "@/lib/connectors/slack";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const workspaceId = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/dashboard/connectors?error=slack_denied", process.env.NEXT_PUBLIC_APP_URL!));
  }
  if (!code || !workspaceId) {
    return NextResponse.redirect(new URL("/dashboard/connectors?error=slack_missing_params", process.env.NEXT_PUBLIC_APP_URL!));
  }

  try {
    const tokenData = await exchangeSlackCode(code);

    await db.connectorCredential.upsert({
      where: { workspaceId_connectorType: { workspaceId, connectorType: "SLACK" } },
      create: {
        workspaceId,
        connectorType: "SLACK",
        status: "ACTIVE",
        accessToken: tokenData.access_token,
        teamId: tokenData.team.id,
        teamName: tokenData.team.name,
        scopes: tokenData.scope,
      },
      update: {
        status: "ACTIVE",
        accessToken: tokenData.access_token,
        teamId: tokenData.team.id,
        teamName: tokenData.team.name,
        scopes: tokenData.scope,
      },
    });

    // Kick off backfill in background (don't await — just trigger it)
    backfillSlackSignals(workspaceId, 30).catch(console.error);

    return NextResponse.redirect(new URL("/dashboard/connectors?connected=slack", process.env.NEXT_PUBLIC_APP_URL!));
  } catch (err) {
    console.error("Slack OAuth callback error:", err);
    return NextResponse.redirect(new URL("/dashboard/connectors?error=slack_exchange_failed", process.env.NEXT_PUBLIC_APP_URL!));
  }
}
