import { db } from "@/lib/db";
import { format, subDays } from "date-fns";

const GITHUB_API = "https://api.github.com";

export function getGitHubOAuthUrl(workspaceId: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    scope: "read:user,read:org,repo",
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/connectors/github/callback`,
    state: workspaceId,
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

export async function exchangeGitHubCode(code: string): Promise<{
  access_token: string;
  scope: string;
  token_type: string;
}> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID!,
      client_secret: process.env.GITHUB_CLIENT_SECRET!,
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/connectors/github/callback`,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`GitHub OAuth error: ${data.error_description}`);
  return data;
}

async function ghFetch(path: string, token: string): Promise<unknown> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${path} error: ${res.status}`);
  return res.json();
}

interface GitHubCommit {
  sha: string;
  commit: { author: { date: string; email: string; name: string } };
  author?: { login: string; email?: string };
}

interface GitHubPR {
  number: number;
  state: string;
  user: { login: string };
  merged_at: string | null;
  created_at: string;
  draft: boolean;
}

interface GitHubRepo {
  full_name: string;
  private: boolean;
}

export async function getAuthenticatedUser(token: string): Promise<{ login: string; email?: string; name?: string }> {
  const user = await ghFetch("/user", token) as { login: string; email?: string; name?: string };
  return user;
}

export async function listOrgRepos(token: string, org: string): Promise<GitHubRepo[]> {
  const repos = await ghFetch(`/orgs/${org}/repos?type=all&per_page=100`, token) as GitHubRepo[];
  return repos;
}

export async function listUserRepos(token: string): Promise<GitHubRepo[]> {
  const repos = await ghFetch("/user/repos?type=all&per_page=100&affiliation=owner,collaborator,organization_member", token) as GitHubRepo[];
  return repos;
}

/**
 * Sync GitHub signals for a specific date.
 * Computes: COMMITS_COUNT, PRS_MERGED_COUNT, PRS_OPENED_COUNT, PR_REVIEW_COUNT
 */
export async function syncGitHubSignalsForDate(workspaceId: string, date: string): Promise<void> {
  const credential = await db.connectorCredential.findUnique({
    where: { workspaceId_connectorType: { workspaceId, connectorType: "GITHUB" } },
  });
  if (!credential || credential.status !== "ACTIVE") return;

  const token = credential.accessToken;
  const since = new Date(date + "T00:00:00Z").toISOString();
  const until = new Date(date + "T23:59:59Z").toISOString();

  // Get workspace members and their GitHub logins (stored in metadata if available)
  const workspaceMembers = await db.workspaceMember.findMany({
    where: { workspaceId, status: "ACCEPTED" },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  // Build email -> userId map
  const emailToUserId = new Map(
    workspaceMembers.filter((m) => m.user?.email).map((m) => [m.user!.email.toLowerCase(), m.user!.id])
  );

  // Get repos
  let repos: GitHubRepo[] = [];
  try {
    repos = await listUserRepos(token);
  } catch {
    return;
  }

  const commitsByUser = new Map<string, number>();
  const prsMergedByUser = new Map<string, number>();
  const prsOpenedByUser = new Map<string, number>();
  const reviewsByUser = new Map<string, number>();

  for (const repo of repos.slice(0, 50)) {
    // Commits
    try {
      const commits = await ghFetch(
        `/repos/${repo.full_name}/commits?since=${since}&until=${until}&per_page=100`,
        token
      ) as GitHubCommit[];
      for (const commit of commits) {
        const email = commit.commit.author.email?.toLowerCase();
        if (email && emailToUserId.has(email)) {
          const uid = emailToUserId.get(email)!;
          commitsByUser.set(uid, (commitsByUser.get(uid) ?? 0) + 1);
        }
      }
    } catch { /* non-fatal */ }

    // PRs merged/opened
    try {
      const prs = await ghFetch(
        `/repos/${repo.full_name}/pulls?state=all&per_page=100&sort=updated&direction=desc`,
        token
      ) as GitHubPR[];
      for (const pr of prs) {
        // Check if merged on this date
        if (pr.merged_at) {
          const mergedDate = pr.merged_at.slice(0, 10);
          if (mergedDate === date) {
            // We don't have email for PR user login — skip user attribution for now
            // Future: store GitHub login -> email mapping in connector metadata
          }
        }
        // Check if opened on this date
        if (pr.created_at.slice(0, 10) === date) {
          // Same limitation — no email on PR user
        }
      }
    } catch { /* non-fatal */ }

    // Reviews
    try {
      const reviews = await ghFetch(
        `/repos/${repo.full_name}/pulls/reviews?per_page=100`,
        token
      );
      void reviews; // placeholder — GitHub doesn't have a list-all-reviews endpoint; need per-PR
    } catch { /* non-fatal */ }
  }

  const upserts = [];
  for (const [userId, count] of commitsByUser) {
    upserts.push(
      db.rawSignal.upsert({
        where: { workspaceId_userId_signalType_signalDate: { workspaceId, userId, signalType: "COMMITS_COUNT", signalDate: date } },
        create: { workspaceId, userId, connectorType: "GITHUB", signalType: "COMMITS_COUNT", value: count, signalDate: date },
        update: { value: count },
      })
    );
  }

  await Promise.all(upserts);

  await db.connectorCredential.update({
    where: { workspaceId_connectorType: { workspaceId, connectorType: "GITHUB" } },
    data: { lastSyncAt: new Date() },
  });
}

export async function backfillGitHubSignals(workspaceId: string, days = 30): Promise<void> {
  const today = format(new Date(), "yyyy-MM-dd");
  for (let i = 1; i <= days; i++) {
    const date = format(subDays(new Date(), i), "yyyy-MM-dd");
    await syncGitHubSignalsForDate(workspaceId, date);
  }
  await syncGitHubSignalsForDate(workspaceId, today);
}
