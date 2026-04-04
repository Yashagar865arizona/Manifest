import { NextRequest, NextResponse } from "next/server";
import { buildDemoAIContext, getCannedAnswer } from "@/lib/demo-data";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { question } = body;

  if (!question || typeof question !== "string" || question.length > 500) {
    return NextResponse.json({ error: "Invalid question" }, { status: 400 });
  }

  // If Anthropic API key is present, use live AI synthesis on demo context
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const anthropic = new Anthropic({ apiKey });

      const teamContext = buildDemoAIContext();

      const systemPrompt = `You are an AI leadership intelligence assistant for Axiom Labs, a 45-person B2B SaaS company.
You have access to real-time team health data synthesized from Slack, GitHub, and Google Calendar signals.
Today is April 5, 2026. This is a demo workspace used for sales demonstrations.

Team data (pulse scores and active anomaly alerts):
${teamContext}

Key signals to be aware of:
- Ryan Torres (Senior SWE, 8-year veteran): GHOST DETECTION — gone quiet for 10 days, 0 commits, 1 Slack msg/day vs 23/day baseline
- Marcus Chen (VP Engineering): OVERLOAD + MEETING_DEBT — 7.8h meetings/day for 14 days, <30min focus time
- Diana Walsh (Account Executive, 14 months): CRITICAL ATTRITION RISK — Slack down 64%, isolation signal, highest-risk tenure window
- Alex Romero (Staff SWE): STALLED WORK — 0 commits for 8 business days, critical infrastructure PR untouched since March 27

Answer the leader's question concisely and accurately using the data above.
Keep responses under 150 words. Use specific numbers. Surface non-obvious insights.`;

      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: "user", content: question }],
      });

      const answer =
        response.content[0].type === "text"
          ? response.content[0].text
          : "Unable to generate response.";

      return NextResponse.json({ answer });
    } catch {
      // Fall through to canned answers if AI call fails
    }
  }

  // Fallback: keyword-matched canned answers (works without API key)
  const answer = getCannedAnswer(question);
  return NextResponse.json({ answer });
}
