import { db } from "./db";
import { format, subDays } from "date-fns";

export interface GhostStatus {
  userId: string;
  memberName: string;
  memberEmail: string;
  consecutiveMisses: number;
  lastCheckInDate: string | null;
  isGhost: boolean; // 3+ consecutive misses
}

/**
 * Calculate consecutive check-in misses for a member in a workspace.
 * Looks back up to 14 days.
 */
export async function calculateGhostStatus(
  workspaceId: string,
  userId: string,
  today: string // YYYY-MM-DD
): Promise<number> {
  let consecutiveMisses = 0;

  for (let i = 1; i <= 14; i++) {
    const date = format(subDays(new Date(today), i), "yyyy-MM-dd");
    const checkIn = await db.checkIn.findUnique({
      where: {
        workspaceId_userId_checkInDate: {
          workspaceId,
          userId,
          checkInDate: date,
        },
      },
    });

    if (checkIn) break; // found a check-in, stop counting
    consecutiveMisses++;
  }

  return consecutiveMisses;
}

/**
 * Get ghost status for all members of a workspace.
 */
export async function getWorkspaceGhostStatuses(
  workspaceId: string,
  today: string
): Promise<GhostStatus[]> {
  const members = await db.workspaceMember.findMany({
    where: {
      workspaceId,
      status: "ACCEPTED",
      role: "MEMBER",
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  const statuses: GhostStatus[] = [];

  for (const member of members) {
    if (!member.user) continue;

    const consecutiveMisses = await calculateGhostStatus(
      workspaceId,
      member.user.id,
      today
    );

    const lastCheckIn = await db.checkIn.findFirst({
      where: { workspaceId, userId: member.user.id },
      orderBy: { checkInDate: "desc" },
      select: { checkInDate: true },
    });

    statuses.push({
      userId: member.user.id,
      memberName: member.user.name ?? member.user.email,
      memberEmail: member.user.email,
      consecutiveMisses,
      lastCheckInDate: lastCheckIn?.checkInDate ?? null,
      isGhost: consecutiveMisses >= 3,
    });
  }

  return statuses;
}
