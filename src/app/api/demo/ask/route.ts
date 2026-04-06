import { NextRequest } from "next/server";
import { buildDemoAIContext, getCannedAnswer, getDemoSnapshot } from "@/lib/demo-data";

const SYSTEM_PROMPT_PREFIX = `You are an AI leadership intelligence assistant for Axiom Labs, a 45-person B2B SaaS company.
You have access to real-time team health data synthesized from Slack, GitHub, and Google Calendar signals.
Today is April 5, 2026. This is a demo workspace used for sales demonstrations.

Key signals to be aware of:
- Ryan Torres (Senior SWE, 8-year veteran): GHOST DETECTION — gone quiet for 10 days, 0 commits, 1 Slack msg/day vs 23/day baseline
- Marcus Chen (VP Engineering): OVERLOAD + MEETING_DEBT — 7.8h meetings/day for 14 days, <30min focus time
- Diana Walsh (Account Executive, 14 months): CRITICAL ATTRITION RISK — Slack down 64%, isolation signal, highest-risk tenure window
- Alex Romero (Staff SWE): STALLED WORK — 0 commits for 8 business days, critical infrastructure PR untouched since March 27

Answer the leader's question concisely and accurately using the data above.
Keep responses under 200 words. Use specific numbers. Surface non-obvious insights.`;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { question } = body;

  if (!question || typeof question !== "string" || question.length > 500) {
    return new Response(JSON.stringify({ error: "Invalid question" }), { status: 400 });
  }

  // Build sources from demo employees with alerts or low pulse
  const employees = getDemoSnapshot("ceo");
  const sources = employees
    .filter((e) => e.openAlerts.length > 0 || e.pulse < 60)
    .slice(0, 8)
    .map((e) => ({
      name: e.userName,
      role: e.title,
      pulse: e.pulse,
      alerts: e.openAlerts.map((a) => a.anomalyType as string),
    }));

  const encoder = new TextEncoder();
  const teamContext = buildDemoAIContext();

  const apiKey = process.env.ANTHROPIC_API_KEY;

  const stream = new ReadableStream({
    async start(controller) {
      // Emit sources immediately
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "sources", sources })}\n\n`)
      );

      if (apiKey) {
        try {
          const { default: Anthropic } = await import("@anthropic-ai/sdk");
          const anthropic = new Anthropic({ apiKey });

          const systemPrompt = `${SYSTEM_PROMPT_PREFIX}

Team data (pulse scores and active anomaly alerts):
${teamContext}`;

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

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
          controller.close();
          return;
        } catch {
          // Fall through to canned answers
        }
      }

      // Fallback: keyword-matched canned answers (works without API key)
      const answer = getCannedAnswer(question);
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "text", text: answer })}\n\n`)
      );
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
