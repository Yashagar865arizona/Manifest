/**
 * AI synthesis engine.
 *
 * Primary provider: OpenAI (free daily quota via board's OpenAI account)
 *   - Paid workspaces  → gpt-5          (250K tokens/day free tier — latest flagship)
 *   - Trial workspaces → gpt-5-mini     (2.5M tokens/day free tier — latest mini)
 *
 * Fallback provider: Anthropic Claude (if ANTHROPIC_API_KEY is set)
 *   - Activates automatically on any OpenAI 5xx / timeout / outage
 *   - Uses claude-haiku-4-5-20251001 for cost efficiency
 *
 * Model selection rationale:
 *   gpt-5 is the current OpenAI flagship. gpt-5-mini is the efficient mini equivalent.
 *   Both are in the board's free daily quota (250K and 2.5M tokens/day respectively).
 *   gpt-4.1 was initially chosen for API stability but gpt-5 is now production-stable
 *   and produces meaningfully superior narrative synthesis — which is our core product.
 *
 * Cost (when exceeding free quota — at standard rates):
 *   gpt-5:        standard OpenAI pricing — check platform.openai.com/pricing
 *   gpt-5-mini:   standard mini pricing   — much cheaper per token
 *   Haiku 4.5:    $1.00/$5.00 per MTok   — fallback only
 */
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

function getOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "sk-placeholder",
  });
}

function getAnthropicClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

export const AI_MODELS = {
  /** Paid workspaces — GPT-5 flagship, in 250K/day free quota */
  premium: "gpt-5",
  /** Trial workspaces — GPT-5 mini, in 2.5M/day free mini quota */
  standard: "gpt-5-mini",
  /** Anthropic fallback — used when OpenAI is unavailable */
  fallback: "claude-haiku-4-5-20251001",
} as const;

export type AITier = "premium" | "standard";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface SynthesisInput {
  workspaceName: string;
  reportDate: string;
  members: Array<{
    name: string;
    email: string;
    checkIn: string | null; // null = no check-in today
    recentCheckIns: Array<{ date: string; content: string }>;
    consecutiveMisses: number;
  }>;
}

export interface SynthesisOutput {
  narrative: string;
  completedItems: string[];
  blockers: Array<{
    member: string;
    blocker: string;
    consecutiveDays: number;
    actionRequired: boolean;
  }>;
  welfareSignals: Array<{
    member: string;
    signal: string;
    severity: "low" | "medium" | "high";
  }>;
  anomalies: Array<{
    member: string;
    type: "vague" | "repetitive" | "ghost" | "overloaded";
    dayCount: number;
    explanation: string;
  }>;
  ghostAlerts: Array<{
    member: string;
    consecutiveMisses: number;
  }>;
  memberScores: Array<{
    member: string;
    confidenceScore: number;
    reason: string;
  }>;
  teamHealthScore: number; // 0-100
}

export interface WeeklyReportInput {
  workspaceName: string;
  weekEnding: string; // YYYY-MM-DD (Friday)
  dailyReports: Array<{
    date: string;
    report: SynthesisOutput;
  }>;
  memberNames: string[];
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const SYNTHESIS_SYSTEM_PROMPT = `You are an AI management intelligence engine. Your job is to analyze daily team check-ins and produce an executive-level intelligence report for the manager.

CRITICAL: You are NOT summarizing raw responses. You are synthesizing, interpreting, and flagging patterns. The manager should read your output and know exactly what requires their attention without reading any individual check-in.

Rules for the narrative:
- Write in third person ("Sarah has flagged...", "The team completed...")
- Lead with wins, then flags, then welfare
- Flag any blocker mentioned 2+ consecutive days as urgent
- Flag vague responses (no specific tasks mentioned) after 3+ consecutive days
- Flag repetitive/copy-paste responses after 3 consecutive days
- Flag welfare signals (overwhelmed, stressed, tired, burned out)
- Confidence score: 1.0 = specific tasks, concrete progress. 0.0 = ghost or "nothing to report"

Return ONLY valid JSON — no markdown fences, no explanation. The narrative should be 3-5 sentences of flowing prose, not bullets.`;

const WEEKLY_REPORT_PROMPT = `You are generating a one-page weekly summary for a manager to forward to their CEO or share in a team meeting.

Format it as clean prose, NOT as a list dump. It should read like something a COO would write to a board.

Sections:
1. **This Week at a Glance** - 2-3 sentence executive summary
2. **What the Team Shipped** - concrete accomplishments
3. **What's Blocked** - unresolved blockers requiring action
4. **Team Welfare** - any signals the manager should follow up on
5. **Looking Ahead** - implied next week priorities from check-ins`;

// ---------------------------------------------------------------------------
// OpenAI synthesis (primary)
// ---------------------------------------------------------------------------

async function synthesizeWithOpenAI(
  input: SynthesisInput,
  model: string
): Promise<SynthesisOutput> {
  const memberContext = input.members.map((m) => ({
    name: m.name,
    todayCheckIn: m.checkIn ?? "NO CHECK-IN SUBMITTED",
    recentHistory: m.recentCheckIns.slice(0, 5),
    consecutiveMisses: m.consecutiveMisses,
  }));

  const userContent = `Workspace: ${input.workspaceName}
Date: ${input.reportDate}
Team check-ins:
${JSON.stringify(memberContext, null, 2)}

Produce the intelligence report JSON with these fields:
- narrative (string): 3-5 sentence prose report for the manager
- completedItems (string[]): list of completed work items mentioned across team
- blockers (array): {member, blocker, consecutiveDays, actionRequired}
- welfareSignals (array): {member, signal, severity: "low"|"medium"|"high"}
- anomalies (array): {member, type: "vague"|"repetitive"|"ghost"|"overloaded", dayCount, explanation}
- ghostAlerts (array): {member, consecutiveMisses} — only for 3+ missed check-ins
- memberScores (array): {member, confidenceScore (0-1), reason}
- teamHealthScore (number 0-100): overall team health estimate`;

  const response = await getOpenAIClient().chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYNTHESIS_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No synthesis output from OpenAI");
  return JSON.parse(content) as SynthesisOutput;
}

// ---------------------------------------------------------------------------
// Anthropic synthesis (fallback)
// ---------------------------------------------------------------------------

async function synthesizeWithAnthropic(
  input: SynthesisInput
): Promise<SynthesisOutput> {
  const client = getAnthropicClient();
  if (!client) throw new Error("Anthropic fallback not configured");

  const memberContext = input.members.map((m) => ({
    name: m.name,
    todayCheckIn: m.checkIn ?? "NO CHECK-IN SUBMITTED",
    recentHistory: m.recentCheckIns.slice(0, 5),
    consecutiveMisses: m.consecutiveMisses,
  }));

  const userContent = `Workspace: ${input.workspaceName}
Date: ${input.reportDate}
Team check-ins:
${JSON.stringify(memberContext, null, 2)}

Produce the intelligence report as a single JSON object with narrative, completedItems, blockers, welfareSignals, anomalies, ghostAlerts, memberScores, teamHealthScore fields.
Return ONLY the JSON object.`;

  const response = await client.messages.create({
    model: AI_MODELS.fallback,
    max_tokens: 2048,
    system: SYNTHESIS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = response.content.find((c) => c.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No synthesis output from Anthropic fallback");
  }
  return JSON.parse(textBlock.text) as SynthesisOutput;
}

// ---------------------------------------------------------------------------
// Public API — with automatic fallback
// ---------------------------------------------------------------------------

export async function synthesizeCheckIns(
  input: SynthesisInput,
  tier: AITier = "premium"
): Promise<SynthesisOutput> {
  const primaryModel = AI_MODELS[tier];

  try {
    return await synthesizeWithOpenAI(input, primaryModel);
  } catch (primaryError) {
    const errMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);
    console.warn(`[AI] OpenAI ${primaryModel} failed: ${errMsg}. Attempting Anthropic fallback.`);

    try {
      const result = await synthesizeWithAnthropic(input);
      console.info("[AI] Anthropic fallback succeeded.");
      return result;
    } catch (fallbackError) {
      const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      console.error(`[AI] All providers failed. OpenAI: ${errMsg} | Anthropic: ${fallbackMsg}`);
      throw new Error(`AI synthesis unavailable: ${errMsg}`);
    }
  }
}

export async function generateWeeklyReport(
  input: WeeklyReportInput,
  tier: AITier = "premium"
): Promise<string> {
  const primaryModel = AI_MODELS[tier];
  const userContent = `Workspace: ${input.workspaceName}
Week ending: ${input.weekEnding}
Team members: ${input.memberNames.join(", ")}

Daily synthesis reports for this week:
${JSON.stringify(input.dailyReports, null, 2)}

Generate the one-page weekly report in markdown format.`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: primaryModel,
      messages: [
        { role: "system", content: WEEKLY_REPORT_PROMPT },
        { role: "user", content: userContent },
      ],
    });
    return response.choices[0]?.message?.content ?? "Unable to generate report.";
  } catch (primaryError) {
    const errMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);
    console.warn(`[AI] OpenAI weekly report failed: ${errMsg}. Attempting Anthropic fallback.`);

    const client = getAnthropicClient();
    if (!client) throw primaryError;

    try {
      const response = await client.messages.create({
        model: AI_MODELS.fallback,
        max_tokens: 2048,
        system: WEEKLY_REPORT_PROMPT,
        messages: [{ role: "user", content: userContent }],
      });
      const textBlock = response.content.find((c) => c.type === "text");
      return textBlock && textBlock.type === "text"
        ? textBlock.text
        : "Unable to generate report.";
    } catch (fallbackError) {
      console.error("[AI] All providers failed for weekly report.");
      throw primaryError;
    }
  }
}
