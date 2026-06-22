"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { importMeso, isAlreadyImported } from "@/lib/import/importMeso";
import type { ImportManifestEntry, ParsedMeso } from "@/lib/import/format";

type Status = "idle" | "importing" | "done" | "exists" | "error";

export default function ImportPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<ImportManifestEntry[]>([]);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/imports/manifest.json")
      .then((r) => (r.ok ? r.json() : []))
      .then(async (list: ImportManifestEntry[]) => {
        setEntries(list);
        const next: Record<string, Status> = {};
        for (const e of list) {
          if (await isAlreadyImported(e.source)) next[e.source] = "exists";
        }
        setStatus(next);
      })
      .catch(() => setEntries([]));
  }, []);

  async function runImport(entry: ImportManifestEntry) {
    setStatus((s) => ({ ...s, [entry.source]: "importing" }));
    setError(null);
    try {
      if (await isAlreadyImported(entry.source)) {
        setStatus((s) => ({ ...s, [entry.source]: "exists" }));
        return;
      }
      const res = await fetch(entry.file);
      if (!res.ok) throw new Error(`Could not load ${entry.file}`);
      const parsed: ParsedMeso = await res.json();
      const result = await importMeso(parsed);
      setStatus((s) => ({ ...s, [entry.source]: "done" }));
      router.push(`/meso/${result.mesoId}`);
    } catch (e) {
      setStatus((s) => ({ ...s, [entry.source]: "error" }));
      setError(e instanceof Error ? e.message : "Import failed");
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-24 pt-6">
      <header className="mb-5">
        <Link href="/" className="text-sm text-muted">
          ‹ Home
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Import</h1>
        <p className="text-sm text-muted">
          Pull in your old training spreadsheets as mesocycles.
        </p>
      </header>

      {error && (
        <div className="card mb-4 border-red-500/40 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {entries.length === 0 && (
          <p className="text-muted">No importable sheets found.</p>
        )}
        {entries.map((e) => {
          const st = status[e.source] ?? "idle";
          return (
            <div key={e.source} className="card">
              <div className="font-semibold">{e.name}</div>
              <div className="mb-3 text-sm text-muted">{e.summary}</div>
              {st === "exists" ? (
                <div className="text-sm font-medium text-accent">
                  ✓ Already imported
                </div>
              ) : (
                <button
                  className="btn-accent w-full"
                  disabled={st === "importing"}
                  onClick={() => runImport(e)}
                >
                  {st === "importing" ? "Importing…" : "Import"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        More sheets get added here as they’re processed. Each import is
        fully on-device.
      </p>
    </main>
  );
}
