/**
 * Synthetic demo data for Axiom Labs — a 45-person B2B SaaS company.
 *
 * This data is entirely static (no DB, no auth) and is used exclusively
 * by the /demo route and /api/demo/ask endpoint.
 *
 * Story: Axiom Labs looks healthy on the surface, but three red signals
 * are buried in the data that only a leadership intelligence tool surfaces.
 */

// ─────────────────────────────────────────────
// TYPES (self-contained — no Prisma dependency)
// ─────────────────────────────────────────────

export type DemoAnomalyType =
  | "GHOST_DETECTION"
  | "OVERLOAD"
  | "ATTRITION_RISK"
  | "MEETING_DEBT"
  | "STALLED_WORK";

export type DemoSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type DemoSignalType =
  | "MESSAGE_COUNT"
  | "CHANNEL_ACTIVITY_COUNT"
  | "DM_SENT_COUNT"
  | "DM_RESPONSE_LATENCY_MIN"
  | "REACTION_COUNT"
  | "COMMITS_COUNT"
  | "PRS_MERGED_COUNT"
  | "PRS_OPENED_COUNT"
  | "PR_REVIEW_COUNT"
  | "ISSUES_CLOSED_COUNT"
  | "ISSUES_OPENED_COUNT"
  | "MEETING_HOURS"
  | "FOCUS_TIME_HOURS"
  | "CALENDAR_EVENTS_COUNT"
  | "ONEONONE_COUNT";

export type DemoLeadershipRole = "CEO" | "MANAGER" | "HR" | "IC";

export interface DemoAlert {
  id: string;
  anomalyType: DemoAnomalyType;
  severity: DemoSeverity;
  title: string;
  detail: string;
  detectedAt: Date;
}

export interface DemoEmployee {
  userId: string;
  userName: string;
  userEmail: string;
  leadershipRole: DemoLeadershipRole;
  department: string;
  title: string;
  tenureMonths: number;
  managerId: string | null;
  signals: Partial<Record<DemoSignalType, number>>;
  baselines: Partial<Record<DemoSignalType, number>>;
  openAlerts: DemoAlert[];
  pulse: number;
}

// ─────────────────────────────────────────────
// OPEN ALERTS (the four key signals)
// ─────────────────────────────────────────────

const ALERTS: Record<string, DemoAlert[]> = {
  "ryan-torres": [
    {
      id: "alert-ghost-ryan",
      anomalyType: "GHOST_DETECTION",
      severity: "HIGH",
      title: "Ryan Torres has gone quiet",
      detail:
        "Activity dropped >2 std deviations below 30-day baseline on Slack and GitHub for 10 consecutive days. Was averaging 23 Slack messages/day and 4.2 commits/day.",
      detectedAt: new Date("2026-03-26"),
    },
  ],
  "marcus-chen": [
    {
      id: "alert-overload-marcus",
      anomalyType: "OVERLOAD",
      severity: "MEDIUM",
      title: "Marcus Chen may be overloaded",
      detail:
        "7.8h/day in meetings for 14 consecutive days (threshold: 6h/day). Focus time has collapsed to under 30 min/day.",
      detectedAt: new Date("2026-03-22"),
    },
    {
      id: "alert-meetingdebt-marcus",
      anomalyType: "MEETING_DEBT",
      severity: "MEDIUM",
      title: "Marcus Chen has excessive meeting load",
      detail:
        "7.8h/day in meetings over the past 7 days (97% of 8hr workday). Threshold: 40%.",
      detectedAt: new Date("2026-03-25"),
    },
  ],
  "diana-walsh": [
    {
      id: "alert-attrition-diana",
      anomalyType: "ATTRITION_RISK",
      severity: "CRITICAL",
      title: "Attrition risk signal for Diana Walsh",
      detail:
        "Slack: 4 msg/day (baseline: 11.2). GitHub: 0 commits (no baseline, non-technical role). 14-month tenure — in the highest-risk attrition window. Both communication and output signals declining.",
      detectedAt: new Date("2026-03-29"),
    },
  ],
  "alex-romero": [
    {
      id: "alert-stalled-alex",
      anomalyType: "STALLED_WORK",
      severity: "LOW",
      title: "Work stalled for Alex Romero",
      detail:
        "No commits for 8 consecutive business days. Expected baseline: 3.8 commits/day. A critical infrastructure PR has been open and untouched since March 27.",
      detectedAt: new Date("2026-03-28"),
    },
  ],
};

// ─────────────────────────────────────────────
// FULL ORG (45 people)
// ─────────────────────────────────────────────

export const DEMO_EMPLOYEES: DemoEmployee[] = [
  // ── CEO / Exec (not tracked in team signals, used for viewer identity) ──
  // Daniel Park is the demo viewer — not in the team table

  // ── Engineering (15) ─────────────────────────────────────────────────
  {
    userId: "marcus-chen",
    userName: "Marcus Chen",
    userEmail: "marcus@axiom-labs.com",
    leadershipRole: "MANAGER",
    department: "Engineering",
    title: "VP Engineering",
    tenureMonths: 38,
    managerId: null,
    signals: { MESSAGE_COUNT: 18, COMMITS_COUNT: 0, MEETING_HOURS: 7.8, FOCUS_TIME_HOURS: 0.4 },
    baselines: { MESSAGE_COUNT: 15.2, COMMITS_COUNT: 1.2, MEETING_HOURS: 3.1, FOCUS_TIME_HOURS: 3.2 },
    openAlerts: ALERTS["marcus-chen"],
    pulse: 22,
  },
  {
    userId: "ryan-torres",
    userName: "Ryan Torres",
    userEmail: "ryan@axiom-labs.com",
    leadershipRole: "IC",
    department: "Engineering",
    title: "Senior Software Engineer",
    tenureMonths: 96,
    managerId: "marcus-chen",
    signals: { MESSAGE_COUNT: 1, COMMITS_COUNT: 0, MEETING_HOURS: 1.1, FOCUS_TIME_HOURS: 5.8 },
    baselines: { MESSAGE_COUNT: 23.4, COMMITS_COUNT: 4.2, MEETING_HOURS: 1.8, FOCUS_TIME_HOURS: 4.5 },
    openAlerts: ALERTS["ryan-torres"],
    pulse: 8,
  },
  {
    userId: "alex-romero",
    userName: "Alex Romero",
    userEmail: "alex@axiom-labs.com",
    leadershipRole: "IC",
    department: "Engineering",
    title: "Staff Software Engineer",
    tenureMonths: 52,
    managerId: "marcus-chen",
    signals: { MESSAGE_COUNT: 12, COMMITS_COUNT: 0, MEETING_HOURS: 2.5, FOCUS_TIME_HOURS: 3.2 },
    baselines: { MESSAGE_COUNT: 14.5, COMMITS_COUNT: 3.8, MEETING_HOURS: 2.8, FOCUS_TIME_HOURS: 4.5 },
    openAlerts: ALERTS["alex-romero"],
    pulse: 35,
  },
  {
    userId: "priya-kapoor",
    userName: "Priya Kapoor",
    userEmail: "priya.k@axiom-labs.com",
    leadershipRole: "IC",
    department: "Engineering",
    title: "Software Engineer II",
    tenureMonths: 24,
    managerId: "marcus-chen",
    signals: { MESSAGE_COUNT: 19, COMMITS_COUNT: 3.1, MEETING_HOURS: 2.2, FOCUS_TIME_HOURS: 4.8 },
    baselines: { MESSAGE_COUNT: 17.3, COMMITS_COUNT: 2.9, MEETING_HOURS: 2.0, FOCUS_TIME_HOURS: 4.5 },
    openAlerts: [],
    pulse: 76,
  },
  {
    userId: "james-liu",
    userName: "James Liu",
    userEmail: "james@axiom-labs.com",
    leadershipRole: "IC",
    department: "Engineering",
    title: "Software Engineer I",
    tenureMonths: 11,
    managerId: "marcus-chen",
    signals: { MESSAGE_COUNT: 22, COMMITS_COUNT: 2.4, MEETING_HOURS: 2.8, FOCUS_TIME_HOURS: 3.9 },
    baselines: { MESSAGE_COUNT: 20.1, COMMITS_COUNT: 2.2, MEETING_HOURS: 2.6, FOCUS_TIME_HOURS: 3.7 },
    openAlerts: [],
    pulse: 82,
  },
  {
    userId: "sarah-park",
    userName: "Sarah Park",
    userEmail: "sarah.p@axiom-labs.com",
    leadershipRole: "IC",
    department: "Engineering",
    title: "Senior Software Engineer",
    tenureMonths: 31,
    managerId: "marcus-chen",
    signals: { MESSAGE_COUNT: 16, COMMITS_COUNT: 3.5, MEETING_HOURS: 2.4, FOCUS_TIME_HOURS: 4.2 },
    baselines: { MESSAGE_COUNT: 15.8, COMMITS_COUNT: 3.3, MEETING_HOURS: 2.5, FOCUS_TIME_HOURS: 4.0 },
    openAlerts: [],
    pulse: 74,
  },
  {
    userId: "michael-wang",
    userName: "Michael Wang",
    userEmail: "michael@axiom-labs.com",
    leadershipRole: "IC",
    department: "Engineering",
    title: "Software Engineer II",
    tenureMonths: 19,
    managerId: "marcus-chen",
    signals: { MESSAGE_COUNT: 14, COMMITS_COUNT: 2.1, MEETING_HOURS: 3.1, FOCUS_TIME_HOURS: 3.5 },
    baselines: { MESSAGE_COUNT: 15.2, COMMITS_COUNT: 2.4, MEETING_HOURS: 2.8, FOCUS_TIME_HOURS: 3.8 },
    openAlerts: [],
    pulse: 68,
  },
  {
    userId: "emily-chen",
    userName: "Emily Chen",
    userEmail: "emily@axiom-labs.com",
    leadershipRole: "IC",
    department: "Engineering",
    title: "Senior Software Engineer",
    tenureMonths: 43,
    managerId: "marcus-chen",
    signals: { MESSAGE_COUNT: 21, COMMITS_COUNT: 3.8, MEETING_HOURS: 2.0, FOCUS_TIME_HOURS: 5.1 },
    baselines: { MESSAGE_COUNT: 19.4, COMMITS_COUNT: 3.6, MEETING_HOURS: 2.1, FOCUS_TIME_HOURS: 4.9 },
    openAlerts: [],
    pulse: 79,
  },
  {
    userId: "david-kim",
    userName: "David Kim",
    userEmail: "david@axiom-labs.com",
    leadershipRole: "IC",
    department: "Engineering",
    title: "Software Engineer II",
    tenureMonths: 28,
    managerId: "marcus-chen",
    signals: { MESSAGE_COUNT: 11, COMMITS_COUNT: 1.8, MEETING_HOURS: 3.4, FOCUS_TIME_HOURS: 2.9 },
    baselines: { MESSAGE_COUNT: 13.2, COMMITS_COUNT: 2.1, MEETING_HOURS: 3.0, FOCUS_TIME_HOURS: 3.5 },
    openAlerts: [],
    pulse: 57,
  },
  {
    userId: "jason-zhang",
    userName: "Jason Zhang",
    userEmail: "jason@axiom-labs.com",
    leadershipRole: "IC",
    department: "Engineering",
    title: "Staff Software Engineer",
    tenureMonths: 61,
    managerId: "marcus-chen",
    signals: { MESSAGE_COUNT: 25, COMMITS_COUNT: 4.9, MEETING_HOURS: 1.9, FOCUS_TIME_HOURS: 5.4 },
    baselines: { MESSAGE_COUNT: 23.1, COMMITS_COUNT: 4.6, MEETING_HOURS: 2.0, FOCUS_TIME_HOURS: 5.2 },
    openAlerts: [],
    pulse: 85,
  },
  {
    userId: "rachel-scott",
    userName: "Rachel Scott",
    userEmail: "rachel@axiom-labs.com",
    leadershipRole: "IC",
    department: "Engineering",
    title: "Software Engineer I",
    tenureMonths: 8,
    managerId: "marcus-chen",
    signals: { MESSAGE_COUNT: 18, COMMITS_COUNT: 1.9, MEETING_HOURS: 2.7, FOCUS_TIME_HOURS: 3.8 },
    baselines: { MESSAGE_COUNT: 16.8, COMMITS_COUNT: 1.7, MEETING_HOURS: 2.5, FOCUS_TIME_HOURS: 3.6 },
    openAlerts: [],
    pulse: 71,
  },
  {
    userId: "kevin-brown",
    userName: "Kevin Brown",
    userEmail: "kevin@axiom-labs.com",
    leadershipRole: "IC",
    department: "Engineering",
    title: "Senior Software Engineer",
    tenureMonths: 35,
    managerId: "marcus-chen",
    signals: { MESSAGE_COUNT: 13, COMMITS_COUNT: 2.7, MEETING_HOURS: 2.9, FOCUS_TIME_HOURS: 3.7 },
    baselines: { MESSAGE_COUNT: 14.1, COMMITS_COUNT: 2.9, MEETING_HOURS: 2.7, FOCUS_TIME_HOURS: 3.9 },
    openAlerts: [],
    pulse: 66,
  },
  {
    userId: "lisa-nguyen",
    userName: "Lisa Nguyen",
    userEmail: "lisa.n@axiom-labs.com",
    leadershipRole: "IC",
    department: "Engineering",
    title: "Software Engineer II",
    tenureMonths: 22,
    managerId: "marcus-chen",
    signals: { MESSAGE_COUNT: 17, COMMITS_COUNT: 2.5, MEETING_HOURS: 2.3, FOCUS_TIME_HOURS: 4.3 },
    baselines: { MESSAGE_COUNT: 16.5, COMMITS_COUNT: 2.3, MEETING_HOURS: 2.2, FOCUS_TIME_HOURS: 4.2 },
    openAlerts: [],
    pulse: 73,
  },
  {
    userId: "tom-wilson",
    userName: "Tom Wilson",
    userEmail: "tom@axiom-labs.com",
    leadershipRole: "IC",
    department: "Engineering",
    title: "Software Engineer II",
    tenureMonths: 17,
    managerId: "marcus-chen",
    signals: { MESSAGE_COUNT: 10, COMMITS_COUNT: 1.5, MEETING_HOURS: 3.6, FOCUS_TIME_HOURS: 2.7 },
    baselines: { MESSAGE_COUNT: 12.8, COMMITS_COUNT: 2.0, MEETING_HOURS: 3.1, FOCUS_TIME_HOURS: 3.4 },
    openAlerts: [],
    pulse: 54,
  },
  {
    userId: "amy-foster",
    userName: "Amy Foster",
    userEmail: "amy@axiom-labs.com",
    leadershipRole: "IC",
    department: "Engineering",
    title: "Software Engineer I",
    tenureMonths: 6,
    managerId: "marcus-chen",
    signals: { MESSAGE_COUNT: 20, COMMITS_COUNT: 2.0, MEETING_HOURS: 2.6, FOCUS_TIME_HOURS: 3.9 },
    baselines: { MESSAGE_COUNT: 18.7, COMMITS_COUNT: 1.8, MEETING_HOURS: 2.4, FOCUS_TIME_HOURS: 3.7 },
    openAlerts: [],
    pulse: 78,
  },

  // ── Sales (12) ────────────────────────────────────────────────────────
  {
    userId: "sarah-kim",
    userName: "Sarah Kim",
    userEmail: "sarah.k@axiom-labs.com",
    leadershipRole: "MANAGER",
    department: "Sales",
    title: "VP Sales",
    tenureMonths: 29,
    managerId: null,
    signals: { MESSAGE_COUNT: 31, COMMITS_COUNT: 0, MEETING_HOURS: 5.2, FOCUS_TIME_HOURS: 2.1 },
    baselines: { MESSAGE_COUNT: 29.4, COMMITS_COUNT: 0, MEETING_HOURS: 5.0, FOCUS_TIME_HOURS: 2.3 },
    openAlerts: [],
    pulse: 80,
  },
  {
    userId: "diana-walsh",
    userName: "Diana Walsh",
    userEmail: "diana@axiom-labs.com",
    leadershipRole: "IC",
    department: "Sales",
    title: "Account Executive",
    tenureMonths: 14,
    managerId: "sarah-kim",
    signals: { MESSAGE_COUNT: 4, COMMITS_COUNT: 0, MEETING_HOURS: 2.1, FOCUS_TIME_HOURS: 2.8 },
    baselines: { MESSAGE_COUNT: 11.2, COMMITS_COUNT: 0, MEETING_HOURS: 2.5, FOCUS_TIME_HOURS: 4.1 },
    openAlerts: ALERTS["diana-walsh"],
    pulse: 18,
  },
  {
    userId: "james-martinez",
    userName: "James Martinez",
    userEmail: "james.m@axiom-labs.com",
    leadershipRole: "IC",
    department: "Sales",
    title: "Senior Account Executive",
    tenureMonths: 33,
    managerId: "sarah-kim",
    signals: { MESSAGE_COUNT: 27, COMMITS_COUNT: 0, MEETING_HOURS: 4.8, FOCUS_TIME_HOURS: 2.4 },
    baselines: { MESSAGE_COUNT: 25.6, COMMITS_COUNT: 0, MEETING_HOURS: 4.5, FOCUS_TIME_HOURS: 2.6 },
    openAlerts: [],
    pulse: 77,
  },
  {
    userId: "lisa-chen",
    userName: "Lisa Chen",
    userEmail: "lisa.c@axiom-labs.com",
    leadershipRole: "IC",
    department: "Sales",
    title: "Account Executive",
    tenureMonths: 20,
    managerId: "sarah-kim",
    signals: { MESSAGE_COUNT: 29, COMMITS_COUNT: 0, MEETING_HOURS: 4.6, FOCUS_TIME_HOURS: 2.7 },
    baselines: { MESSAGE_COUNT: 27.1, COMMITS_COUNT: 0, MEETING_HOURS: 4.4, FOCUS_TIME_HOURS: 2.8 },
    openAlerts: [],
    pulse: 81,
  },
  {
    userId: "robert-taylor",
    userName: "Robert Taylor",
    userEmail: "robert@axiom-labs.com",
    leadershipRole: "IC",
    department: "Sales",
    title: "Sales Development Rep",
    tenureMonths: 9,
    managerId: "sarah-kim",
    signals: { MESSAGE_COUNT: 38, COMMITS_COUNT: 0, MEETING_HOURS: 3.2, FOCUS_TIME_HOURS: 3.1 },
    baselines: { MESSAGE_COUNT: 36.4, COMMITS_COUNT: 0, MEETING_HOURS: 3.0, FOCUS_TIME_HOURS: 3.0 },
    openAlerts: [],
    pulse: 73,
  },
  {
    userId: "emma-davis",
    userName: "Emma Davis",
    userEmail: "emma@axiom-labs.com",
    leadershipRole: "IC",
    department: "Sales",
    title: "Senior Account Executive",
    tenureMonths: 41,
    managerId: "sarah-kim",
    signals: { MESSAGE_COUNT: 32, COMMITS_COUNT: 0, MEETING_HOURS: 5.1, FOCUS_TIME_HOURS: 2.2 },
    baselines: { MESSAGE_COUNT: 30.2, COMMITS_COUNT: 0, MEETING_HOURS: 4.8, FOCUS_TIME_HOURS: 2.4 },
    openAlerts: [],
    pulse: 86,
  },
  {
    userId: "chris-anderson",
    userName: "Chris Anderson",
    userEmail: "chris@axiom-labs.com",
    leadershipRole: "IC",
    department: "Sales",
    title: "Account Executive",
    tenureMonths: 16,
    managerId: "sarah-kim",
    signals: { MESSAGE_COUNT: 22, COMMITS_COUNT: 0, MEETING_HOURS: 4.1, FOCUS_TIME_HOURS: 2.9 },
    baselines: { MESSAGE_COUNT: 23.8, COMMITS_COUNT: 0, MEETING_HOURS: 4.3, FOCUS_TIME_HOURS: 3.1 },
    openAlerts: [],
    pulse: 69,
  },
  {
    userId: "ashley-johnson",
    userName: "Ashley Johnson",
    userEmail: "ashley@axiom-labs.com",
    leadershipRole: "IC",
    department: "Sales",
    title: "Sales Development Rep",
    tenureMonths: 7,
    managerId: "sarah-kim",
    signals: { MESSAGE_COUNT: 41, COMMITS_COUNT: 0, MEETING_HOURS: 2.9, FOCUS_TIME_HOURS: 3.4 },
    baselines: { MESSAGE_COUNT: 39.2, COMMITS_COUNT: 0, MEETING_HOURS: 2.7, FOCUS_TIME_HOURS: 3.3 },
    openAlerts: [],
    pulse: 75,
  },
  {
    userId: "brandon-lee",
    userName: "Brandon Lee",
    userEmail: "brandon@axiom-labs.com",
    leadershipRole: "IC",
    department: "Sales",
    title: "Senior Account Executive",
    tenureMonths: 27,
    managerId: "sarah-kim",
    signals: { MESSAGE_COUNT: 18, COMMITS_COUNT: 0, MEETING_HOURS: 4.7, FOCUS_TIME_HOURS: 2.0 },
    baselines: { MESSAGE_COUNT: 21.3, COMMITS_COUNT: 0, MEETING_HOURS: 4.2, FOCUS_TIME_HOURS: 2.5 },
    openAlerts: [],
    pulse: 58,
  },
  {
    userId: "melissa-garcia",
    userName: "Melissa Garcia",
    userEmail: "melissa@axiom-labs.com",
    leadershipRole: "IC",
    department: "Sales",
    title: "Account Executive",
    tenureMonths: 23,
    managerId: "sarah-kim",
    signals: { MESSAGE_COUNT: 28, COMMITS_COUNT: 0, MEETING_HOURS: 4.4, FOCUS_TIME_HOURS: 2.6 },
    baselines: { MESSAGE_COUNT: 26.9, COMMITS_COUNT: 0, MEETING_HOURS: 4.2, FOCUS_TIME_HOURS: 2.8 },
    openAlerts: [],
    pulse: 79,
  },
  {
    userId: "tyler-thompson",
    userName: "Tyler Thompson",
    userEmail: "tyler@axiom-labs.com",
    leadershipRole: "IC",
    department: "Sales",
    title: "Sales Development Rep",
    tenureMonths: 5,
    managerId: "sarah-kim",
    signals: { MESSAGE_COUNT: 35, COMMITS_COUNT: 0, MEETING_HOURS: 2.7, FOCUS_TIME_HOURS: 3.6 },
    baselines: { MESSAGE_COUNT: 33.4, COMMITS_COUNT: 0, MEETING_HOURS: 2.5, FOCUS_TIME_HOURS: 3.4 },
    openAlerts: [],
    pulse: 71,
  },
  {
    userId: "stephanie-miller",
    userName: "Stephanie Miller",
    userEmail: "stephanie@axiom-labs.com",
    leadershipRole: "IC",
    department: "Sales",
    title: "Senior Account Executive",
    tenureMonths: 46,
    managerId: "sarah-kim",
    signals: { MESSAGE_COUNT: 33, COMMITS_COUNT: 0, MEETING_HOURS: 4.9, FOCUS_TIME_HOURS: 2.3 },
    baselines: { MESSAGE_COUNT: 31.7, COMMITS_COUNT: 0, MEETING_HOURS: 4.7, FOCUS_TIME_HOURS: 2.5 },
    openAlerts: [],
    pulse: 83,
  },

  // ── Product / Design (8) ─────────────────────────────────────────────
  {
    userId: "jordan-rivera",
    userName: "Jordan Rivera",
    userEmail: "jordan@axiom-labs.com",
    leadershipRole: "MANAGER",
    department: "Product",
    title: "Head of Product",
    tenureMonths: 36,
    managerId: null,
    signals: { MESSAGE_COUNT: 24, COMMITS_COUNT: 0, MEETING_HOURS: 5.4, FOCUS_TIME_HOURS: 2.0 },
    baselines: { MESSAGE_COUNT: 22.8, COMMITS_COUNT: 0, MEETING_HOURS: 5.2, FOCUS_TIME_HOURS: 2.2 },
    openAlerts: [],
    pulse: 84,
  },
  {
    userId: "nathan-clark",
    userName: "Nathan Clark",
    userEmail: "nathan@axiom-labs.com",
    leadershipRole: "IC",
    department: "Product",
    title: "Product Manager",
    tenureMonths: 18,
    managerId: "jordan-rivera",
    signals: { MESSAGE_COUNT: 21, COMMITS_COUNT: 0, MEETING_HOURS: 4.8, FOCUS_TIME_HOURS: 2.4 },
    baselines: { MESSAGE_COUNT: 20.1, COMMITS_COUNT: 0, MEETING_HOURS: 4.6, FOCUS_TIME_HOURS: 2.5 },
    openAlerts: [],
    pulse: 76,
  },
  {
    userId: "olivia-robinson",
    userName: "Olivia Robinson",
    userEmail: "olivia@axiom-labs.com",
    leadershipRole: "IC",
    department: "Product",
    title: "Senior Product Designer",
    tenureMonths: 29,
    managerId: "jordan-rivera",
    signals: { MESSAGE_COUNT: 19, COMMITS_COUNT: 0, MEETING_HOURS: 3.6, FOCUS_TIME_HOURS: 3.8 },
    baselines: { MESSAGE_COUNT: 18.2, COMMITS_COUNT: 0, MEETING_HOURS: 3.4, FOCUS_TIME_HOURS: 3.7 },
    openAlerts: [],
    pulse: 81,
  },
  {
    userId: "lucas-walker",
    userName: "Lucas Walker",
    userEmail: "lucas@axiom-labs.com",
    leadershipRole: "IC",
    department: "Product",
    title: "Product Manager",
    tenureMonths: 21,
    managerId: "jordan-rivera",
    signals: { MESSAGE_COUNT: 17, COMMITS_COUNT: 0, MEETING_HOURS: 4.3, FOCUS_TIME_HOURS: 2.8 },
    baselines: { MESSAGE_COUNT: 16.4, COMMITS_COUNT: 0, MEETING_HOURS: 4.1, FOCUS_TIME_HOURS: 2.9 },
    openAlerts: [],
    pulse: 73,
  },
  {
    userId: "isabella-hall",
    userName: "Isabella Hall",
    userEmail: "isabella@axiom-labs.com",
    leadershipRole: "IC",
    department: "Product",
    title: "UX Researcher",
    tenureMonths: 15,
    managerId: "jordan-rivera",
    signals: { MESSAGE_COUNT: 16, COMMITS_COUNT: 0, MEETING_HOURS: 3.9, FOCUS_TIME_HOURS: 3.4 },
    baselines: { MESSAGE_COUNT: 15.3, COMMITS_COUNT: 0, MEETING_HOURS: 3.7, FOCUS_TIME_HOURS: 3.5 },
    openAlerts: [],
    pulse: 79,
  },
  {
    userId: "ethan-young",
    userName: "Ethan Young",
    userEmail: "ethan@axiom-labs.com",
    leadershipRole: "IC",
    department: "Product",
    title: "Senior Product Manager",
    tenureMonths: 44,
    managerId: "jordan-rivera",
    signals: { MESSAGE_COUNT: 23, COMMITS_COUNT: 0, MEETING_HOURS: 5.1, FOCUS_TIME_HOURS: 2.1 },
    baselines: { MESSAGE_COUNT: 21.9, COMMITS_COUNT: 0, MEETING_HOURS: 4.9, FOCUS_TIME_HOURS: 2.3 },
    openAlerts: [],
    pulse: 85,
  },
  {
    userId: "chloe-allen",
    userName: "Chloe Allen",
    userEmail: "chloe@axiom-labs.com",
    leadershipRole: "IC",
    department: "Product",
    title: "Product Designer",
    tenureMonths: 13,
    managerId: "jordan-rivera",
    signals: { MESSAGE_COUNT: 15, COMMITS_COUNT: 0, MEETING_HOURS: 3.2, FOCUS_TIME_HOURS: 4.1 },
    baselines: { MESSAGE_COUNT: 14.6, COMMITS_COUNT: 0, MEETING_HOURS: 3.0, FOCUS_TIME_HOURS: 4.0 },
    openAlerts: [],
    pulse: 72,
  },
  {
    userId: "mason-king",
    userName: "Mason King",
    userEmail: "mason@axiom-labs.com",
    leadershipRole: "IC",
    department: "Product",
    title: "Product Manager",
    tenureMonths: 26,
    managerId: "jordan-rivera",
    signals: { MESSAGE_COUNT: 20, COMMITS_COUNT: 0, MEETING_HOURS: 4.5, FOCUS_TIME_HOURS: 2.6 },
    baselines: { MESSAGE_COUNT: 19.3, COMMITS_COUNT: 0, MEETING_HOURS: 4.3, FOCUS_TIME_HOURS: 2.8 },
    openAlerts: [],
    pulse: 77,
  },

  // ── Operations (10) ─────────────────────────────────────────────────
  {
    userId: "priya-nair",
    userName: "Priya Nair",
    userEmail: "priya.nair@axiom-labs.com",
    leadershipRole: "MANAGER",
    department: "Operations",
    title: "COO",
    tenureMonths: 48,
    managerId: null,
    signals: { MESSAGE_COUNT: 28, COMMITS_COUNT: 0, MEETING_HOURS: 6.1, FOCUS_TIME_HOURS: 1.4 },
    baselines: { MESSAGE_COUNT: 27.3, COMMITS_COUNT: 0, MEETING_HOURS: 5.9, FOCUS_TIME_HOURS: 1.6 },
    openAlerts: [],
    pulse: 77,
  },
  {
    userId: "jennifer-harris",
    userName: "Jennifer Harris",
    userEmail: "jennifer@axiom-labs.com",
    leadershipRole: "IC",
    department: "Operations",
    title: "Finance Lead",
    tenureMonths: 39,
    managerId: "priya-nair",
    signals: { MESSAGE_COUNT: 22, COMMITS_COUNT: 0, MEETING_HOURS: 3.8, FOCUS_TIME_HOURS: 3.2 },
    baselines: { MESSAGE_COUNT: 21.4, COMMITS_COUNT: 0, MEETING_HOURS: 3.6, FOCUS_TIME_HOURS: 3.3 },
    openAlerts: [],
    pulse: 80,
  },
  {
    userId: "christopher-lewis",
    userName: "Christopher Lewis",
    userEmail: "christopher@axiom-labs.com",
    leadershipRole: "IC",
    department: "Operations",
    title: "Operations Manager",
    tenureMonths: 31,
    managerId: "priya-nair",
    signals: { MESSAGE_COUNT: 19, COMMITS_COUNT: 0, MEETING_HOURS: 4.2, FOCUS_TIME_HOURS: 2.8 },
    baselines: { MESSAGE_COUNT: 18.6, COMMITS_COUNT: 0, MEETING_HOURS: 4.0, FOCUS_TIME_HOURS: 2.9 },
    openAlerts: [],
    pulse: 74,
  },
  {
    userId: "amanda-white",
    userName: "Amanda White",
    userEmail: "amanda@axiom-labs.com",
    leadershipRole: "HR",
    department: "Operations",
    title: "People Operations Lead",
    tenureMonths: 35,
    managerId: "priya-nair",
    signals: { MESSAGE_COUNT: 25, COMMITS_COUNT: 0, MEETING_HOURS: 4.5, FOCUS_TIME_HOURS: 2.5 },
    baselines: { MESSAGE_COUNT: 24.1, COMMITS_COUNT: 0, MEETING_HOURS: 4.3, FOCUS_TIME_HOURS: 2.6 },
    openAlerts: [],
    pulse: 82,
  },
  {
    userId: "joshua-robinson",
    userName: "Joshua Robinson",
    userEmail: "joshua@axiom-labs.com",
    leadershipRole: "IC",
    department: "Operations",
    title: "Legal Counsel",
    tenureMonths: 27,
    managerId: "priya-nair",
    signals: { MESSAGE_COUNT: 14, COMMITS_COUNT: 0, MEETING_HOURS: 3.4, FOCUS_TIME_HOURS: 3.6 },
    baselines: { MESSAGE_COUNT: 13.7, COMMITS_COUNT: 0, MEETING_HOURS: 3.2, FOCUS_TIME_HOURS: 3.7 },
    openAlerts: [],
    pulse: 71,
  },
  {
    userId: "brittany-turner",
    userName: "Brittany Turner",
    userEmail: "brittany@axiom-labs.com",
    leadershipRole: "IC",
    department: "Operations",
    title: "Business Operations Analyst",
    tenureMonths: 22,
    managerId: "priya-nair",
    signals: { MESSAGE_COUNT: 21, COMMITS_COUNT: 0, MEETING_HOURS: 3.7, FOCUS_TIME_HOURS: 3.1 },
    baselines: { MESSAGE_COUNT: 20.3, COMMITS_COUNT: 0, MEETING_HOURS: 3.5, FOCUS_TIME_HOURS: 3.2 },
    openAlerts: [],
    pulse: 76,
  },
  {
    userId: "aaron-phillips",
    userName: "Aaron Phillips",
    userEmail: "aaron@axiom-labs.com",
    leadershipRole: "IC",
    department: "Operations",
    title: "IT Manager",
    tenureMonths: 44,
    managerId: "priya-nair",
    signals: { MESSAGE_COUNT: 17, COMMITS_COUNT: 1.2, MEETING_HOURS: 3.0, FOCUS_TIME_HOURS: 3.8 },
    baselines: { MESSAGE_COUNT: 16.4, COMMITS_COUNT: 1.1, MEETING_HOURS: 2.8, FOCUS_TIME_HOURS: 3.7 },
    openAlerts: [],
    pulse: 73,
  },
  {
    userId: "nicole-carter",
    userName: "Nicole Carter",
    userEmail: "nicole@axiom-labs.com",
    leadershipRole: "IC",
    department: "Operations",
    title: "Executive Assistant",
    tenureMonths: 19,
    managerId: "priya-nair",
    signals: { MESSAGE_COUNT: 29, COMMITS_COUNT: 0, MEETING_HOURS: 4.1, FOCUS_TIME_HOURS: 2.3 },
    baselines: { MESSAGE_COUNT: 27.8, COMMITS_COUNT: 0, MEETING_HOURS: 3.9, FOCUS_TIME_HOURS: 2.4 },
    openAlerts: [],
    pulse: 84,
  },
  {
    userId: "tyler-nelson",
    userName: "Tyler Nelson",
    userEmail: "tyler.n@axiom-labs.com",
    leadershipRole: "IC",
    department: "Operations",
    title: "Revenue Operations Analyst",
    tenureMonths: 16,
    managerId: "priya-nair",
    signals: { MESSAGE_COUNT: 20, COMMITS_COUNT: 0, MEETING_HOURS: 3.3, FOCUS_TIME_HOURS: 3.5 },
    baselines: { MESSAGE_COUNT: 19.4, COMMITS_COUNT: 0, MEETING_HOURS: 3.1, FOCUS_TIME_HOURS: 3.6 },
    openAlerts: [],
    pulse: 78,
  },
];

// ─────────────────────────────────────────────
// VIEWS: filtered slices per role
// ─────────────────────────────────────────────

export function getDemoSnapshot(role: "ceo" | "manager" | "hr"): DemoEmployee[] {
  if (role === "manager") {
    // Engineering manager view — Marcus is the manager
    return DEMO_EMPLOYEES.filter(
      (e) => e.department === "Engineering"
    );
  }
  if (role === "hr") {
    // HR cares about everyone — sort attrition risks first
    return [...DEMO_EMPLOYEES].sort((a, b) => {
      const aHasAttrition = a.openAlerts.some((x) => x.anomalyType === "ATTRITION_RISK");
      const bHasAttrition = b.openAlerts.some((x) => x.anomalyType === "ATTRITION_RISK");
      if (aHasAttrition && !bHasAttrition) return -1;
      if (!aHasAttrition && bHasAttrition) return 1;
      return a.pulse - b.pulse; // then sort by pulse ascending (worst first)
    });
  }
  // CEO view: all employees, sorted by pulse ascending (exceptions first)
  return [...DEMO_EMPLOYEES].sort((a, b) => a.pulse - b.pulse);
}

export function getDemoAlerts(role: "ceo" | "manager" | "hr"): DemoAlert[] {
  const employees = getDemoSnapshot(role);
  const seen = new Set<string>();
  const alerts: DemoAlert[] = [];
  for (const emp of employees) {
    for (const alert of emp.openAlerts) {
      if (!seen.has(alert.id)) {
        seen.add(alert.id);
        alerts.push(alert);
      }
    }
  }
  // Sort: CRITICAL > HIGH > MEDIUM > LOW
  const ORDER: Record<DemoSeverity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  return alerts.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}

// ─────────────────────────────────────────────
// SUMMARY STATS
// ─────────────────────────────────────────────

export function getDemoStats(role: "ceo" | "manager" | "hr") {
  const employees = getDemoSnapshot(role);
  const alerts = getDemoAlerts(role);
  const avgPulse = Math.round(
    employees.reduce((s, e) => s + e.pulse, 0) / employees.length
  );
  const criticalAlerts = alerts.filter(
    (a) => a.severity === "CRITICAL" || a.severity === "HIGH"
  ).length;
  const ghostCount = alerts.filter((a) => a.anomalyType === "GHOST_DETECTION").length;
  const overloadCount = alerts.filter((a) => a.anomalyType === "OVERLOAD").length;
  return { avgPulse, criticalAlerts, ghostCount, overloadCount, totalEmployees: employees.length };
}

// ─────────────────────────────────────────────
// AI CONTEXT (for the ask endpoint)
// ─────────────────────────────────────────────

export function buildDemoAIContext(): string {
  const lines = DEMO_EMPLOYEES.map((e) => {
    const alerts = e.openAlerts.map((a) => `${a.anomalyType}: ${a.detail}`).join("; ");
    return `${e.userName} (${e.title}, ${e.department}, ${e.tenureMonths}mo tenure): pulse=${e.pulse}/100${alerts ? `, alerts=[${alerts}]` : ""}`;
  });
  return lines.join("\n");
}

// ─────────────────────────────────────────────
// CANNED DEMO ANSWERS (fallback if no API key)
// ─────────────────────────────────────────────

export const CANNED_ANSWERS: Array<{ keywords: string[]; answer: string }> = [
  {
    keywords: ["risk", "attrition", "leaving", "churn", "quit"],
    answer:
      "Critical attrition risk: Diana Walsh (Sales, 14 months tenure) has Slack activity down 64% from baseline and no GitHub output. She's in the highest-risk attrition window (12–18 months). Recommend a 1:1 check-in with her manager Sarah Kim this week.",
  },
  {
    keywords: ["quiet", "ghost", "inactive", "gone", "silent", "disappeared"],
    answer:
      "Ryan Torres (Senior SWE, 8-year veteran) has been completely quiet for 10 days — 0 commits and only 1 Slack message/day vs his 23/day baseline. This is unusual for someone of his tenure. The combination of ghost + overload in engineering is a red flag worth investigating.",
  },
  {
    keywords: ["overload", "burnout", "meetings", "overloaded", "tired"],
    answer:
      "Marcus Chen (VP Engineering) is in critical overload: 7.8h/day in meetings for 14 consecutive days, leaving under 30 minutes of focus time daily. His team also has a ghost (Ryan Torres) and a stalled PR (Alex Romero) — the leadership gap may be systemic. Recommend auditing his calendar immediately.",
  },
  {
    keywords: ["engineering", "eng", "developers", "devs", "tech"],
    answer:
      "Engineering has 3 active signals: (1) Marcus Chen is overloaded — 7.8h/day in meetings. (2) Ryan Torres has gone quiet for 10 days. (3) Alex Romero has a critical infrastructure PR stalled for 8 business days. Average team pulse: 62/100. The combination of a burned-out VP and a disengaged senior IC is a retention risk.",
  },
  {
    keywords: ["stalled", "pr", "pull request", "blocked", "stuck"],
    answer:
      "Alex Romero (Staff Engineer) has had 0 commits for 8 consecutive business days. There's an open critical infrastructure PR that's been untouched since March 27. Given Marcus Chen is in meeting overload, Alex may lack the unblocking decisions he needs. This is costing delivery velocity.",
  },
  {
    keywords: ["who", "worst", "bottom", "lowest", "alert"],
    answer:
      "Top 3 concerns by pulse score: (1) Ryan Torres — pulse 8/100, gone quiet for 10 days. (2) Diana Walsh — pulse 18/100, CRITICAL attrition risk at 14-month tenure. (3) Marcus Chen — pulse 22/100, severe meeting overload. These three together represent compounding risk in two key functions.",
  },
  {
    keywords: ["sales", "revenue", "quota", "pipeline"],
    answer:
      "Sales team is largely healthy (avg pulse 75/100) with one exception: Diana Walsh (AE, 14 months) shows CRITICAL attrition risk — Slack activity down 64% and isolation signals over the past two weeks. Emma Davis, Stephanie Miller, and Lisa Chen are all above 77 pulse. VP Sales Sarah Kim looks stable.",
  },
  {
    keywords: ["summary", "brief", "overview", "today", "week", "everything"],
    answer:
      "Axiom Labs summary: 45 people, avg pulse 71/100. Active signals: (CRITICAL) Attrition risk — Diana Walsh; (HIGH) Ryan Torres gone quiet 10 days; (MEDIUM) Marcus Chen overloaded 7.8h meetings/day; (LOW) Alex Romero work stalled 8 days. Engineering is the highest-risk function with 3 simultaneous signals. Recommend CEO check-in with Marcus and direct HR outreach to Diana.",
  },
];

export function getCannedAnswer(question: string): string {
  const q = question.toLowerCase();
  for (const { keywords, answer } of CANNED_ANSWERS) {
    if (keywords.some((kw) => q.includes(kw))) return answer;
  }
  return "Based on current Axiom Labs data: 4 active signals across Engineering and Sales. The most urgent is Diana Walsh (CRITICAL attrition risk, 14-month tenure) and Marcus Chen (VP Eng overloaded at 7.8h meetings/day). Engineering team pulse is 62/100; all other teams are above 72/100.";
}
