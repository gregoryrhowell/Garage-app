"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { addDay, startOrResumeSession } from "@/lib/repo";
import { PlanEditor } from "@/components/PlanEditor";

export default function MesoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [week, setWeek] = useState(1);
  const [editing, setEditing] = useState(false);

  const meso = useLiveQuery(() => db().mesocycles.get(id), [id]);
  const days = useLiveQuery(
    async () => {
      const list = await db().days.where("mesoId").equals(id).toArray();
      return list.sort((a, b) => a.order - b.order);
    },
    [id],
  );
  // All sessions for this meso so we can show per-day status for the week.
  const sessions = useLiveQuery(
    () => db().sessions.where("mesoId").equals(id).toArray(),
    [id],
  );

  async function start(dayId: string) {
    const s = await startOrResumeSession(id, dayId, week);
    router.push(`/session/${s.id}`);
  }

  if (!meso) {
    return <main className="p-6 text-muted">Loading…</main>;
  }

  const weekNums = Array.from({ length: meso.weeks }, (_, i) => i + 1);

  return (
    <main className="mx-auto max-w-md px-4 pb-24 pt-6">
      <header className="mb-4">
        <Link href="/" className="text-sm text-muted">
          ‹ Mesocycles
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{meso.name}</h1>
      </header>

      {/* Week selector */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {weekNums.map((w) => (
          <button
            key={w}
            onClick={() => setWeek(w)}
            className={`min-w-[3rem] rounded-xl px-3 py-2 text-sm font-semibold ${
              w === week ? "bg-accent text-black" : "bg-surface2 text-muted"
            }`}
          >
            W{w}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Week {week} — Training days</h2>
        <button
          className="text-sm font-medium text-accent"
          onClick={() => setEditing((e) => !e)}
        >
          {editing ? "Done" : "Edit plan"}
        </button>
      </div>

      <div className="space-y-3">
        {days?.length === 0 && (
          <p className="text-muted">No training days yet. Tap “Edit plan” to add some.</p>
        )}
        {days?.map((d) => {
          const session = sessions?.find(
            (s) => s.dayId === d.id && s.week === week,
          );
          const status = session?.completedAt
            ? "Done"
            : session
              ? "Resume"
              : "Start";
          return (
            <div key={d.id} className="card">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{d.name}</div>
                <button
                  className={status === "Done" ? "btn-ghost" : "btn-accent"}
                  onClick={() => start(d.id)}
                >
                  {status}
                </button>
              </div>
              {editing && <PlanEditor dayId={d.id} />}
            </div>
          );
        })}
      </div>

      {editing && <AddDay mesoId={id} />}
    </main>
  );
}

function AddDay({ mesoId }: { mesoId: string }) {
  const [name, setName] = useState("");
  async function add() {
    if (!name.trim()) return;
    await addDay(mesoId, name);
    setName("");
  }
  return (
    <div className="mt-4 flex gap-2">
      <input
        className="input"
        placeholder="Add training day (e.g. Upper A)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button className="btn-accent shrink-0" onClick={add}>
        Add
      </button>
    </div>
  );
}
