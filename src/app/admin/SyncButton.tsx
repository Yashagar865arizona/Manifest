"use client";

import { useState } from "react";

export function SyncButton({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [detail, setDetail] = useState<string | null>(null);

  async function handleSync() {
    setState("loading");
    setDetail(null);
    try {
      const res = await fetch("/api/admin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState("error");
        setDetail(data.error ?? "Unknown error");
      } else {
        setState("ok");
        if (data.errors?.length) setDetail(data.errors.join("; "));
      }
    } catch (err) {
      setState("error");
      setDetail(String(err));
    }
    setTimeout(() => setState("idle"), 4000);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSync}
        disabled={state === "loading"}
        className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        title={`Manually sync ${workspaceName}`}
      >
        {state === "loading" ? "Syncing…" : "Sync now"}
      </button>
      {state === "ok" && (
        <span className="text-xs text-green-600">{detail ? `⚠ ${detail}` : "✓ Done"}</span>
      )}
      {state === "error" && (
        <span className="text-xs text-red-600" title={detail ?? undefined}>✗ Error</span>
      )}
    </div>
  );
}
