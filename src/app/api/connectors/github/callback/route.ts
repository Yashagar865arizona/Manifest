import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exchangeGitHubCode, getAuthenticatedUser, backfillGitHubSignals } from "@/lib/connectors/github";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const workspaceId = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/connectors?error=github_denied", process.env.NEXT_PUBLIC_APP_URL!));
  }
  if (!code || !workspaceId) {
    return NextResponse.redirect(new URL("/connectors?error=github_missing_params", process.env.NEXT_PUBLIC_APP_URL!));
  }

  try {
    const tokenData = await exchangeGitHubCode(code);
    const ghUser = await getAuthenticatedUser(tokenData.access_token);

    await db.connectorCredential.upsert({
      where: { workspaceId_connectorType: { workspaceId, connectorType: "GITHUB" } },
      create: {
        workspaceId,
        connectorType: "GITHUB",
        status: "ACTIVE",
        accessToken: tokenData.access_token,
        teamName: ghUser.login,
        scopes: tokenData.scope,
      },
      update: {
        status: "ACTIVE",
        accessToken: tokenData.access_token,
        teamName: ghUser.login,
        scopes: tokenData.scope,
      },
    });

    backfillGitHubSignals(workspaceId, 30).catch(console.error);

    return NextResponse.redirect(new URL("/connectors?connected=github", process.env.NEXT_PUBLIC_APP_URL!));
  } catch (err) {
    console.error("GitHub OAuth callback error:", err);
    return NextResponse.redirect(new URL("/connectors?error=github_exchange_failed", process.env.NEXT_PUBLIC_APP_URL!));
  }
}
