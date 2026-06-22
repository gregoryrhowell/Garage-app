"use client";

import { use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import {
  addSetToExercise,
  completeSession,
  removeSet,
  updateSet,
} from "@/lib/repo";
import type { SetLog } from "@/lib/types";

export default function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const session = useLiveQuery(() => db().sessions.get(id), [id]);
  const day = useLiveQuery(
    () => (session ? db().days.get(session.dayId) : undefined),
    [session?.dayId],
  );
  const planned = useLiveQuery(
    async () => {
      if (!session) return [];
      const list = await db()
        .plannedExercises.where("dayId")
        .equals(session.dayId)
        .toArray();
      return list.sort((a, b) => a.order - b.order);
    },
    [session?.dayId],
  );
  const exercises = useLiveQuery(() => db().exercises.toArray(), []);
  const sets = useLiveQuery(
    () => db().sets.where("sessionId").equals(id).toArray(),
    [id],
  );
  // Previous week's sets for the same day, to show a "last time" reference.
  const prevSets = useLiveQuery(
    async () => {
      if (!session || session.week <= 1) return [];
      const prev = await db()
        .sessions.where({ dayId: session.dayId })
        .and((s) => s.mesoId === session.mesoId && s.week === session.week - 1)
        .first();
      if (!prev) return [];
      return db().sets.where("sessionId").equals(prev.id).toArray();
    },
    [session?.dayId, session?.week],
  );

  const nameById = useMemo(
    () => new Map((exercises ?? []).map((e) => [e.id, e.name])),
    [exercises],
  );

  const setsByPlanned = useMemo(() => {
    const map = new Map<string, SetLog[]>();
    for (const s of sets ?? []) {
      const arr = map.get(s.plannedExerciseId) ?? [];
      arr.push(s);
      map.set(s.plannedExerciseId, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.setIndex - b.setIndex);
    return map;
  }, [sets]);

  const prevByPlanned = useMemo(() => {
    const map = new Map<string, SetLog[]>();
    for (const s of prevSets ?? []) {
      const arr = map.get(s.plannedExerciseId) ?? [];
      arr.push(s);
      map.set(s.plannedExerciseId, arr);
    }
    return map;
  }, [prevSets]);

  async function finish() {
    await completeSession(id);
    if (session) router.push(`/meso/${session.mesoId}`);
  }

  if (!session || !day) {
    return <main className="p-6 text-muted">Loading…</main>;
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-32 pt-6">
      <header className="mb-5">
        <button
          className="text-sm text-muted"
          onClick={() => router.push(`/meso/${session.mesoId}`)}
        >
          ‹ Back
        </button>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{day.name}</h1>
        <p className="text-sm text-muted">
          Week {session.week} · {session.date}
          {session.completedAt && " · ✓ completed"}
        </p>
      </header>

      <div className="space-y-5">
        {planned?.map((pe) => {
          const rows = setsByPlanned.get(pe.id) ?? [];
          const prev = prevByPlanned.get(pe.id) ?? [];
          return (
            <section key={pe.id} className="card">
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="font-semibold">
                  {nameById.get(pe.exerciseId) ?? "Exercise"}
                </h2>
                <span className="text-xs text-muted">
                  target {pe.targetSets}×{pe.repLow}-{pe.repHigh}
                  {pe.targetRir != null && ` @${pe.targetRir} RIR`}
                </span>
              </div>

              <div className="mb-1 grid grid-cols-[1.5rem_1fr_1fr_3rem_2rem] items-center gap-2 px-1 text-[10px] uppercase tracking-wide text-muted">
                <span>#</span>
                <span>Weight</span>
                <span>Reps</span>
                <span>RIR</span>
                <span></span>
              </div>

              <div className="space-y-2">
                {rows.map((s, i) => (
                  <SetRow
                    key={s.id}
                    set={s}
                    index={i}
                    prev={prev[i]}
                  />
                ))}
              </div>

              <button
                className="mt-3 w-full rounded-lg border border-dashed border-border py-2 text-sm font-medium text-muted hover:text-white"
                onClick={() =>
                  addSetToExercise(id, pe.id, pe.exerciseId)
                }
              >
                + Add set
              </button>
            </section>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-md">
          <button className="btn-accent w-full text-base" onClick={finish}>
            {session.completedAt ? "Save changes" : "Finish workout"}
          </button>
        </div>
      </div>
    </main>
  );
}

function SetRow({
  set,
  index,
  prev,
}: {
  set: SetLog;
  index: number;
  prev?: SetLog;
}) {
  const prevHint =
    prev && (prev.weight != null || prev.reps != null)
      ? `${prev.weight ?? "–"}×${prev.reps ?? "–"}`
      : null;

  return (
    <div
      className={`grid grid-cols-[1.5rem_1fr_1fr_3rem_2rem] items-center gap-2 rounded-lg px-1 py-1 ${
        set.done ? "bg-accent/10" : ""
      }`}
    >
      <span className="text-center text-sm font-semibold text-muted">
        {index + 1}
      </span>
      <input
        className="input px-2 py-2 text-center"
        type="number"
        inputMode="decimal"
        placeholder={prevHint ? String(prev?.weight ?? "") : "—"}
        value={set.weight ?? ""}
        onChange={(e) =>
          updateSet(set.id, {
            weight: e.target.value === "" ? undefined : Number(e.target.value),
          })
        }
      />
      <input
        className="input px-2 py-2 text-center"
        type="number"
        inputMode="numeric"
        placeholder={prevHint ? String(prev?.reps ?? "") : "—"}
        value={set.reps ?? ""}
        onChange={(e) =>
          updateSet(set.id, {
            reps: e.target.value === "" ? undefined : Number(e.target.value),
          })
        }
      />
      <input
        className="input px-1 py-2 text-center"
        type="number"
        inputMode="numeric"
        placeholder="—"
        value={set.rir ?? ""}
        onChange={(e) =>
          updateSet(set.id, {
            rir: e.target.value === "" ? undefined : Number(e.target.value),
          })
        }
      />
      <button
        className={`flex h-9 items-center justify-center rounded-lg text-lg ${
          set.done ? "bg-accent text-black" : "bg-surface2 text-muted"
        }`}
        onClick={() => updateSet(set.id, { done: !set.done })}
        aria-label={set.done ? "Mark set not done" : "Mark set done"}
        onContextMenu={(e) => {
          e.preventDefault();
          removeSet(set.id);
        }}
      >
        ✓
      </button>
    </div>
  );
}
