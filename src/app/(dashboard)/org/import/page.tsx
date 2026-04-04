export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { OrgImportClient } from "./OrgImportClient";

export default async function OrgImportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id, status: "ACCEPTED" },
    select: { workspaceId: true, role: true },
  });

  if (!membership) redirect("/dashboard");
  // Only managers can import
  if (membership.role !== "MANAGER") redirect("/org");

  return <OrgImportClient workspaceId={membership.workspaceId} />;
}
