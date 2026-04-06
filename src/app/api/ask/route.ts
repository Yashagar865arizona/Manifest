import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkspaceSignalSnapshots, computePulseScore } from "@/lib/signals";
import { format } from "date-fns";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { question } = await request.json();
  if (!question || typeof question !== "string" || question.length > 500) {
    return new Response(JSON.stringify({ error: "Invalid question" }), { status: 400 });
  }

  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id, status: "ACCEPTED" },
    include: { workspace: true },
  });
  if (!membership) {
    return new Response(JSON.stringify({ error: "No workspace found" }), { status: 404 });
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const allSnapshots = await getWorkspaceSignalSnapshots(membership.workspaceId, today);

  // Score and rank — surface most severe signals first, cap at 30
  const snapWithPulse = allSnapshots
    .map((s) => ({ ...s, pulse: computePulseScore(s) }))
    .sort((a, b) => {
      const aAlerts = a.openAlerts.filter((al) => al.severity === "CRITICAL" || al.severity === "HIGH").length;
      const bAlerts = b.openAlerts.filter((al) => al.severity === "CRITICAL" || al.severity === "HIGH").length;
      if (aAlerts !== bAlerts) return bAlerts - aAlerts;
      return a.pulse - b.pulse;
    })
    .slice(0, 30);

  const teamContext = snapWithPulse
    .map((s) => {
      const alerts = s.openAlerts.map((a) => `${a.anomalyType}: ${a.detail}`).join("; ");
      return `${s.userName} (${s.leadershipRole}): pulse=${s.pulse}/100${alerts ? `, alerts=[${alerts}]` : ""}`;
    })
    .join("\n");

  // Build sources: people with alerts or low pulse who may be referenced in the answer
  const sources = snapWithPulse
    .filter((s) => s.openAlerts.length > 0 || s.pulse < 60)
    .slice(0, 8)
    .map((s) => ({
      name: s.userName,
      role: s.leadershipRole,
      pulse: s.pulse,
      alerts: s.openAlerts.map((a) => a.anomalyType as string),
    }));

  const systemPrompt = `You are an AI leadership intelligence assistant for ${membership.workspace.name}.
You have access to real-time team health data. Today is ${today}.

Team data:
${teamContext || "No signal data available yet. Connectors may not be configured."}

Answer the leader's question concisely and accurately. If the data doesn't support a confident answer, say so.
Keep responses under 200 words. Use specific numbers when available.`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Emit sources first so the UI can render them immediately
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "sources", sources })}\n\n`)
      );

      try {
        const aiStream = await anthropic.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          system: systemPrompt,
          messages: [{ role: "user", content: question }],
        });

        for await (const event of aiStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text", text: event.delta.text })}\n\n`
              )
            );
          }
        }
      } catch {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "text", text: "Unable to generate response. Please try again." })}\n\n`
          )
        );
      }

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
