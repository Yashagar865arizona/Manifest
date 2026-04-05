"use client";

import { track } from "@vercel/analytics";

export function DemoRoleLink({
  role,
  active,
  children,
}: {
  role: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={`/demo?role=${role}`}
      onClick={() => {
        if (!active) track("demo_role_switch", { role });
      }}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
        active
          ? "bg-gray-100 text-gray-900 font-medium"
          : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
      }`}
    >
      {children}
    </a>
  );
}
