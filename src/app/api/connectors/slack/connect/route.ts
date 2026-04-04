import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSlackOAuthUrl } from "@/lib/connectors/slack";
import { redirect } from "next/navigation";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id, status: "ACCEPTED", role: "MANAGER" },
    select: { workspaceId: true },
  });
  if (!membership) redirect("/dashboard");

  const url = getSlackOAuthUrl(membership.workspaceId);
  redirect(url);
}
