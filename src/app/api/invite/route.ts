import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/invite?token=XXX — validate token and return invite info
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const member = await db.workspaceMember.findUnique({
    where: { inviteToken: token },
    include: {
      workspace: { select: { name: true, timezone: true } },
    },
  });

  if (!member) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }

  if (member.status === "ACCEPTED") {
    return NextResponse.json({ error: "Invite already used", alreadyAccepted: true }, { status: 409 });
  }

  return NextResponse.json({
    workspaceName: member.workspace.name,
    invitedEmail: member.invitedEmail,
    token,
  });
}

// POST /api/invite — accept invite
export async function POST(request: Request) {
  const session = await getSession();
  const { token } = await request.json();

  const member = await db.workspaceMember.findUnique({
    where: { inviteToken: token },
    include: { workspace: true },
  });

  if (!member || member.status === "ACCEPTED") {
    return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
  }

  let userId: string;

  if (session?.userId) {
    userId = session.userId;
  } else {
    // User must be logged in to accept
    return NextResponse.json(
      { error: "You must be logged in to accept this invite", needsAuth: true },
      { status: 401 }
    );
  }

  await db.workspaceMember.update({
    where: { id: member.id },
    data: {
      userId,
      status: "ACCEPTED",
      joinedAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    workspaceId: member.workspaceId,
    workspaceName: member.workspace.name,
  });
}
