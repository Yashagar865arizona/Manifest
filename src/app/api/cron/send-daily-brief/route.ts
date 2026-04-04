import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { getWorkspaceSignalSnapshots, computePulseScore } from "@/lib/signals";
import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const resend = new Resend(process.env.RESEND_API_KEY!);

type LeadershipRole = "CEO" | "MANAGER" | "HR" | "IC";

async function generateBriefContent(
  role: LeadershipRole,
  workspaceName: string,
  snapshots: Awaited<ReturnType<typeof getWorkspaceSignalSnapshots>>,
  date: string
): Promise<{ headline: string; narrative: string; signals: string[]; actions: string[] }> {
  const anomalyCount = snapshots.reduce((sum, s) => sum + s.openAlerts.length, 0);
  const ghostCount = snapshots.filter((s) =>
    s.openAlerts.some((a) => a.anomalyType === "GHOST_DETECTION")
  ).length;
  const overloadCount = snapshots.filter((s) =>
    s.openAlerts.some((a) => a.anomalyType === "OVERLOAD")
  ).length;
  const avgPulse = Math.round(
    snapshots.reduce((sum, s) => sum + computePulseScore(s), 0) / Math.max(snapshots.length, 1)
  );

  const alertSummary = snapshots
    .filter((s) => s.openAlerts.length > 0)
    .slice(0, 5)
    .map((s) => `- ${s.userName}: ${s.openAlerts.map((a) => a.title).join(", ")}`)
    .join("\n");

  const roleContext: Record<LeadershipRole, string> = {
    CEO: "company-wide risk radar and executive summary",
    MANAGER: "direct report health, individual pulse scores, and 1:1 prep notes",
    HR: "team attrition risk, engagement drift, and org health",
    IC: "your personal productivity and focus signals",
  };

  const prompt = `You are generating a daily leadership intelligence brief for ${workspaceName}.

Date: ${date}
Recipient role: ${role} — focus on ${roleContext[role]}
Team size: ${snapshots.length} people
Average team pulse score: ${avgPulse}/100
Open anomaly alerts: ${anomalyCount} total (${ghostCount} ghost, ${overloadCount} overload)

Key alerts:
${alertSummary || "No active alerts"}

Generate a brief daily intelligence brief with:
1. A short punchy headline (max 12 words)
2. A 2-3 sentence narrative summary appropriate for the ${role} role
3. 3-5 specific signal bullets (what changed, what matters)
4. 1-3 concrete actions the leader should take today

Reply in JSON: { "headline": "...", "narrative": "...", "signals": ["...", ...], "actions": ["...", ...] }`;

  const response = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { headline: "Team update", narrative: text, signals: [], actions: [] };
  } catch {
    return { headline: "Daily brief", narrative: text, signals: [], actions: [] };
  }
}

function renderBriefEmail(
  briefContent: { headline: string; narrative: string; signals: string[]; actions: string[] },
  workspaceName: string,
  date: string,
  role: LeadershipRole
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; background: #f9f9f9; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 32px auto; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; }
    .header { background: #0f0f0f; padding: 24px 32px; }
    .header-label { color: #666; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; }
    .header-title { color: #fff; font-size: 20px; font-weight: 600; margin-top: 6px; line-height: 1.3; }
    .meta { color: #888; font-size: 12px; margin-top: 6px; }
    .body { padding: 24px 32px; }
    .narrative { font-size: 14px; line-height: 1.65; color: #333; margin-bottom: 24px; }
    .section-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #999; margin-bottom: 10px; }
    .signal-list { list-style: none; padding: 0; margin: 0 0 24px; }
    .signal-list li { font-size: 13px; color: #222; padding: 8px 0; border-bottom: 1px solid #f0f0f0; padding-left: 12px; position: relative; }
    .signal-list li::before { content: "→"; position: absolute; left: 0; color: #888; }
    .action-list { list-style: none; padding: 0; margin: 0; }
    .action-list li { font-size: 13px; color: #222; padding: 8px 12px; background: #f5f5f5; border-radius: 4px; margin-bottom: 6px; }
    .footer { padding: 16px 32px; border-top: 1px solid #f0f0f0; font-size: 11px; color: #aaa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-label">${workspaceName} · ${role} Brief</div>
      <div class="header-title">${briefContent.headline}</div>
      <div class="meta">${date}</div>
    </div>
    <div class="body">
      <p class="narrative">${briefContent.narrative}</p>
      ${briefContent.signals.length > 0 ? `
      <div class="section-label">Key signals</div>
      <ul class="signal-list">
        ${briefContent.signals.map((s) => `<li>${s}</li>`).join("")}
      </ul>` : ""}
      ${briefContent.actions.length > 0 ? `
      <div class="section-label">Suggested actions</div>
      <ul class="action-list">
        ${briefContent.actions.map((a) => `<li>${a}</li>`).join("")}
      </ul>` : ""}
    </div>
    <div class="footer">AI Leadership OS · Unsubscribe · View in browser</div>
  </div>
</body>
</html>`;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = format(new Date(), "yyyy-MM-dd");

  const workspaces = await db.workspace.findMany({
    include: { subscription: true },
  });

  let sent = 0;
  let errors = 0;

  for (const workspace of workspaces) {
    try {
      const snapshots = await getWorkspaceSignalSnapshots(workspace.id, today);

      // Get leaders who should receive briefs
      const leaders = await db.workspaceMember.findMany({
        where: {
          workspaceId: workspace.id,
          status: "ACCEPTED",
          leadershipRole: { in: ["CEO", "MANAGER", "HR"] },
        },
        include: { user: { select: { id: true, email: true, name: true } } },
      });

      for (const leader of leaders) {
        if (!leader.user?.email) continue;
        const role = leader.leadershipRole as LeadershipRole;

        // Filter snapshots to leader's span of control (simplified: CEO sees all, others see ICs)
        const relevantSnapshots = role === "CEO" ? snapshots : snapshots.filter((s) => s.leadershipRole === "IC");

        const briefContent = await generateBriefContent(role, workspace.name, relevantSnapshots, today);

        // Upsert DailyBrief record
        await db.dailyBrief.upsert({
          where: {
            workspaceId_userId_briefDate: {
              workspaceId: workspace.id,
              userId: leader.user.id,
              briefDate: today,
            },
          },
          create: {
            workspaceId: workspace.id,
            userId: leader.user.id,
            role,
            briefDate: today,
            content: briefContent,
          },
          update: { content: briefContent },
        });

        // Send email
        const emailHtml = renderBriefEmail(briefContent, workspace.name, today, role);
        await resend.emails.send({
          from: process.env.EMAIL_FROM ?? "brief@yourdomain.com",
          to: leader.user.email,
          subject: `[${workspace.name}] ${briefContent.headline}`,
          html: emailHtml,
        });

        // Mark as sent
        await db.dailyBrief.updateMany({
          where: {
            workspaceId: workspace.id,
            userId: leader.user.id,
            briefDate: today,
          },
          data: { sentAt: new Date() },
        });

        sent++;
      }
    } catch (err) {
      console.error(`Daily brief error for workspace ${workspace.id}:`, err);
      errors++;
    }
  }

  return NextResponse.json({ sent, errors });
}
