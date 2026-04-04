import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkspaceSignalSnapshots, computePulseScore } from "@/lib/signals";
import { format } from "date-fns";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { question } = await request.json();
  if (!question || typeof question !== "string" || question.length > 500) {
    return NextResponse.json({ error: "Invalid question" }, { status: 400 });
  }

  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id, status: "ACCEPTED" },
    include: { workspace: true },
  });
  if (!membership) return NextResponse.json({ error: "No workspace found" }, { status: 404 });

  const today = format(new Date(), "yyyy-MM-dd");
  const snapshots = await getWorkspaceSignalSnapshots(membership.workspaceId, today);

  const teamContext = snapshots
    .map((s) => {
      const pulse = computePulseScore(s);
      const alerts = s.openAlerts.map((a) => `${a.anomalyType}: ${a.detail}`).join("; ");
      return `${s.userName} (${s.leadershipRole}): pulse=${pulse}/100${alerts ? `, alerts=[${alerts}]` : ""}`;
    })
    .join("\n");

  const systemPrompt = `You are an AI leadership intelligence assistant for ${membership.workspace.name}.
You have access to real-time team health data. Today is ${today}.

Team data:
${teamContext || "No signal data available yet. Connectors may not be configured."}

Answer the leader's question concisely and accurately. If the data doesn't support a confident answer, say so.
Keep responses under 150 words. Use specific numbers when available.`;

  const response = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 300,
    system: systemPrompt,
    messages: [{ role: "user", content: question }],
  });

  const answer = response.content[0].type === "text" ? response.content[0].text : "Unable to generate response.";
  return NextResponse.json({ answer });
}
