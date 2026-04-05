export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  if (!ADMIN_EMAIL || session.user.email !== ADMIN_EMAIL) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <span className="text-sm font-bold text-gray-900 tracking-tight">Radar</span>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-600">Admin</span>
        <a href="/dashboard" className="ml-auto text-xs text-gray-400 hover:text-gray-600">
          ← Back to app
        </a>
      </header>
      <main className="p-6 max-w-6xl mx-auto">{children}</main>
    </div>
  );
}
