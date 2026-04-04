"use client";

import { type DragEvent, useRef, useState } from "react";

interface ParsedRow {
  name: string;
  email: string;
  managerEmail?: string;
  title?: string;
  department?: string;
  // client-only validation state
  errors: string[];
}

interface ImportResult {
  imported: number;
  skipped: number;
  importedEmails: string[];
  skippedDetails: Array<{ email: string; reason: string }>;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.trim().split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (ch === "," && !inQuote) {
        cols.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

function validateRows(rows: ParsedRow[]): ParsedRow[] {
  const emails = new Set<string>();
  const emailSet = new Set(rows.map((r) => r.email.toLowerCase()));

  return rows.map((row) => {
    const errors: string[] = [];

    if (!row.name) errors.push("Name is required");
    if (!row.email) {
      errors.push("Email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push("Invalid email format");
    } else if (emails.has(row.email.toLowerCase())) {
      errors.push("Duplicate email");
    } else {
      emails.add(row.email.toLowerCase());
    }

    if (row.managerEmail && row.managerEmail.toLowerCase() === row.email.toLowerCase()) {
      errors.push("Cannot be own manager");
    }

    // Warn (not error) if manager email not in CSV — they may be in the system already
    if (row.managerEmail && !emailSet.has(row.managerEmail.toLowerCase())) {
      // soft warning, not a blocking error
    }

    return { ...row, errors };
  });
}

export function OrgImportClient({ workspaceId }: { workspaceId: string }) {
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function processFileText(text: string) {
    setParseError(null);
    const raw = parseCSV(text);
    if (raw.length < 2) {
      setParseError("CSV must have a header row and at least one data row.");
      return;
    }

    const header = raw[0].map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
    const nameIdx = header.findIndex((h) => h.includes("name"));
    const emailIdx = header.findIndex((h) => h.includes("email"));
    const managerIdx = header.findIndex((h) => h.includes("manager"));
    const roleIdx = header.findIndex(
      (h) => h.includes("role") || h.includes("title")
    );
    const deptIdx = header.findIndex((h) => h.includes("department") || h.includes("dept"));

    if (nameIdx === -1 || emailIdx === -1) {
      setParseError("CSV must have Name and Email columns.");
      return;
    }

    const parsed: ParsedRow[] = raw.slice(1).map((cols) => ({
      name: cols[nameIdx] ?? "",
      email: cols[emailIdx] ?? "",
      managerEmail: managerIdx !== -1 ? cols[managerIdx] || undefined : undefined,
      title: roleIdx !== -1 ? cols[roleIdx] || undefined : undefined,
      department: deptIdx !== -1 ? cols[deptIdx] || undefined : undefined,
      errors: [],
    }));

    setRows(validateRows(parsed));
    setStep("preview");
  }

  function handleFile(file: File) {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setParseError("Please upload a .csv file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => processFileText(e.target?.result as string);
    reader.readAsText(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function runImport() {
    if (replacing && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }

    setLoading(true);
    setApiError(null);

    const validRows = rows.filter((r) => r.errors.length === 0);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/org/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: validRows.map(({ name, email, managerEmail, title, department }) => ({
            name,
            email,
            managerEmail,
            title,
            department,
          })),
          replace: replacing,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setResult(data);
      setStep("done");
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
      setConfirmReplace(false);
    }
  }

  const hasErrors = rows.some((r) => r.errors.length > 0);
  const validCount = rows.filter((r) => r.errors.length === 0).length;

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <a href="/org" className="text-sm text-gray-400 hover:text-gray-600">
          ← Org structure
        </a>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">CSV import</h1>
      </div>

      {step === "upload" && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-sm font-medium text-gray-900 mb-1">Expected format</h2>
            <p className="text-xs text-gray-500 mb-3">
              Column names are flexible — use any order.
            </p>
            <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto text-gray-700">
{`Name,Email,Manager,Role,Department
Jane Smith,jane@co.com,,CEO,Leadership
Bob Jones,bob@co.com,jane@co.com,Engineering Manager,Engineering
Alex Lee,alex@co.com,bob@co.com,Senior Engineer,Engineering`}
            </pre>
            <p className="text-xs text-gray-400 mt-2">
              <strong>Required:</strong> Name, Email &nbsp;·&nbsp;
              <strong>Optional:</strong> Manager (manager&apos;s email), Role/Title, Department
            </p>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${
              dragOver
                ? "border-gray-400 bg-gray-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => handleDrop(e)}
            onClick={() => fileRef.current?.click()}
          >
            <p className="text-sm text-gray-600 font-medium">
              Drop your CSV here, or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-1">.csv files only</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          {parseError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              {parseError}
            </p>
          )}
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                <strong>{rows.length}</strong> rows parsed
                {hasErrors && (
                  <span className="ml-2 text-red-600">
                    · {rows.filter((r) => r.errors.length > 0).length} with errors (will be skipped)
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => { setStep("upload"); setRows([]); setParseError(null); }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Re-upload
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Name</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Email</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Manager</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Title</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Dept</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row, i) => (
                    <tr key={i} className={row.errors.length > 0 ? "bg-red-50" : ""}>
                      <td className="px-4 py-2.5 text-gray-900 whitespace-nowrap">{row.name}</td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{row.email}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                        {row.managerEmail ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                        {row.title ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                        {row.department ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {row.errors.length > 0 ? (
                          <span className="inline-flex flex-col gap-0.5">
                            {row.errors.map((e, j) => (
                              <span key={j} className="text-xs text-red-600">{e}</span>
                            ))}
                          </span>
                        ) : (
                          <span className="text-xs text-green-600">Ready</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-3">
            <input
              id="replace-toggle"
              type="checkbox"
              checked={replacing}
              onChange={(e) => { setReplacing(e.target.checked); setConfirmReplace(false); }}
              className="mt-0.5"
            />
            <label htmlFor="replace-toggle" className="text-sm text-gray-700">
              <span className="font-medium">Replace existing org structure</span>
              <span className="block text-xs text-gray-400 mt-0.5">
                Deletes all current OrgNode records before importing. Use for a clean re-import.
              </span>
            </label>
          </div>

          {confirmReplace && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 font-medium mb-2">
                This will delete the existing org structure before importing. Are you sure?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={runImport}
                  disabled={loading}
                  className="text-sm bg-yellow-600 text-white px-3 py-1.5 rounded-md font-medium hover:bg-yellow-700 disabled:opacity-50"
                >
                  {loading ? "Importing..." : "Yes, replace and import"}
                </button>
                <button
                  onClick={() => setConfirmReplace(false)}
                  className="text-sm text-gray-600 px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {apiError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              {apiError}
            </p>
          )}

          {!confirmReplace && (
            <button
              onClick={runImport}
              disabled={loading || validCount === 0}
              className="bg-gray-900 text-white px-5 py-2.5 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {loading ? "Importing..." : `Import ${validCount} row${validCount !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      )}

      {step === "done" && result && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-5">
            <p className="text-sm font-medium text-green-800 mb-1">Import complete</p>
            <p className="text-sm text-green-700">
              {result.imported} member{result.imported !== 1 ? "s" : ""} imported
              {result.skipped > 0 && `, ${result.skipped} skipped`}.
            </p>
          </div>

          {result.skippedDetails.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-700 mb-2">Skipped rows</p>
              <ul className="space-y-1">
                {result.skippedDetails.map((s, i) => (
                  <li key={i} className="text-xs text-gray-600">
                    <span className="font-mono text-gray-500">{s.email}</span>
                    <span className="ml-2 text-gray-400">— {s.reason}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-400 mt-2">
                Skipped rows are not in this workspace yet. Invite them first, then re-import.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <a
              href="/org"
              className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
            >
              View org structure
            </a>
            <button
              onClick={() => { setStep("upload"); setRows([]); setResult(null); setReplacing(false); }}
              className="text-sm text-gray-600 px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50"
            >
              Import another file
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
