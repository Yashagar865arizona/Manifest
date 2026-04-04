import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const rowSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  managerEmail: z.string().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
});

const importSchema = z.object({
  rows: z.array(rowSchema).min(1),
  replace: z.boolean().default(false),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Must be a manager of this workspace
  const manager = await db.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: session.user.id,
      role: "MANAGER",
      status: "ACCEPTED",
    },
  });
  if (!manager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { rows, replace } = parsed.data;

  // Build email → User lookup for all users in this workspace
  const members = await db.workspaceMember.findMany({
    where: { workspaceId, status: "ACCEPTED" },
    include: { user: { select: { id: true, email: true } } },
  });

  const emailToUserId = new Map<string, string>();
  for (const m of members) {
    if (m.user?.email && m.userId) {
      emailToUserId.set(m.user.email.toLowerCase(), m.userId);
    }
  }

  const imported: string[] = [];
  const skipped: Array<{ email: string; reason: string }> = [];

  // Optionally clear existing org structure
  if (replace) {
    await db.orgNode.deleteMany({ where: { workspaceId } });
  }

  // First pass: collect all emails that resolve to users in this workspace
  // so we can resolve manager emails to userIds
  const rowsByEmail = new Map(rows.map((r) => [r.email.toLowerCase(), r]));

  for (const row of rows) {
    const emailKey = row.email.toLowerCase();
    const userId = emailToUserId.get(emailKey);

    if (!userId) {
      skipped.push({
        email: row.email,
        reason: "No accepted workspace member with this email",
      });
      continue;
    }

    // Resolve manager email to userId
    let managerId: string | null = null;
    if (row.managerEmail) {
      const managerEmailKey = row.managerEmail.toLowerCase();
      const resolvedManagerId = emailToUserId.get(managerEmailKey);
      if (resolvedManagerId) {
        // Prevent self-reference
        if (resolvedManagerId === userId) {
          skipped.push({ email: row.email, reason: "Cannot set self as manager" });
          continue;
        }
        managerId = resolvedManagerId;
      }
      // If manager email not found in system, just leave managerId null (don't skip)
    }

    await db.orgNode.upsert({
      where: { workspaceId_userId: { workspaceId, userId } },
      create: {
        workspaceId,
        userId,
        managerId,
        title: row.title ?? null,
        department: row.department ?? null,
      },
      update: {
        managerId,
        title: row.title ?? null,
        department: row.department ?? null,
      },
    });

    imported.push(row.email);
  }

  return NextResponse.json({
    imported: imported.length,
    skipped: skipped.length,
    importedEmails: imported,
    skippedDetails: skipped,
  });
}
