import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getGoogleOAuthUrl } from "@/lib/connectors/google";
import { redirect } from "next/navigation";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id, status: "ACCEPTED", role: "MANAGER" },
    select: { workspaceId: true },
  });
  if (!membership) redirect("/dashboard");

  redirect(getGoogleOAuthUrl(membership.workspaceId));
}
