"use client";

import Link from "next/link";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { createMesocycle } from "@/lib/repo";

export default function HomePage() {
  const mesos = useLiveQuery(
    () => db().mesocycles.orderBy("createdAt").reverse().toArray(),
    [],
  );
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [weeks, setWeeks] = useState(5);

  async function handleCreate() {
    if (!name.trim()) return;
    await createMesocycle(name, weeks);
    setName("");
    setWeeks(5);
    setShowNew(false);
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-24 pt-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Garage</h1>
          <p className="text-sm text-muted">Your mesocycles</p>
        </div>
        <button className="btn-accent" onClick={() => setShowNew((s) => !s)}>
          {showNew ? "Cancel" : "+ New"}
        </button>
      </header>

      {showNew && (
        <div className="card mb-6 space-y-3">
          <div>
            <label className="label">Mesocycle name</label>
            <input
              className="input mt-1"
              placeholder="e.g. Hypertrophy Block 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Length (weeks)</label>
            <input
              className="input mt-1"
              type="number"
              min={1}
              max={16}
              value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value) || 1)}
            />
          </div>
          <button className="btn-accent w-full" onClick={handleCreate}>
            Create mesocycle
          </button>
        </div>
      )}

      <div className="space-y-3">
        {mesos?.length === 0 && (
          <p className="text-center text-muted">
            No mesocycles yet. Tap “+ New” to start one.
          </p>
        )}
        {mesos?.map((m) => (
          <Link key={m.id} href={`/meso/${m.id}`} className="card block">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{m.name}</div>
                <div className="text-sm text-muted">{m.weeks} weeks</div>
              </div>
              <span className="text-2xl text-muted">›</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
