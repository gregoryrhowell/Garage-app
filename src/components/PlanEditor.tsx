"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { addPlannedExercise, getOrCreateExercise } from "@/lib/repo";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/types";

// Inline editor for a single training day's prescription.
export function PlanEditor({ dayId }: { dayId: string }) {
  const planned = useLiveQuery(
    async () => {
      const list = await db().plannedExercises.where("dayId").equals(dayId).toArray();
      return list.sort((a, b) => a.order - b.order);
    },
    [dayId],
  );
  const exercises = useLiveQuery(() => db().exercises.toArray(), []);
  const nameById = new Map((exercises ?? []).map((e) => [e.id, e.name]));

  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup>("Chest");
  const [sets, setSets] = useState(3);
  const [repTarget, setRepTarget] = useState("8-12");
  const [rirTarget, setRirTarget] = useState("2");

  async function add() {
    if (!name.trim()) return;
    const ex = await getOrCreateExercise(name, muscle);
    await addPlannedExercise(dayId, ex.id, {
      targetSets: sets,
      repTarget: repTarget.trim() || undefined,
      rirTarget: rirTarget.trim() || undefined,
    });
    setName("");
  }

  async function remove(id: string) {
    await db().plannedExercises.delete(id);
  }

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      {planned?.map((pe) => (
        <div
          key={pe.id}
          className="flex items-center justify-between rounded-lg bg-surface2 px-3 py-2 text-sm"
        >
          <span>
            {nameById.get(pe.exerciseId) ?? "Exercise"}
            <span className="text-muted">
              {" · "}
              {pe.targetSets}
              {pe.repTarget ? `×${pe.repTarget}` : ""}
            </span>
          </span>
          <button
            className="text-muted hover:text-white"
            onClick={() => remove(pe.id)}
            aria-label="Remove exercise"
          >
            ✕
          </button>
        </div>
      ))}

      <div className="space-y-2 rounded-lg bg-surface2 p-3">
        <input
          className="input"
          placeholder="Exercise name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          list="exercise-options"
        />
        <datalist id="exercise-options">
          {exercises?.map((e) => (
            <option key={e.id} value={e.name} />
          ))}
        </datalist>
        <div className="grid grid-cols-2 gap-2">
          <select
            className="input"
            value={muscle}
            onChange={(e) => setMuscle(e.target.value as MuscleGroup)}
          >
            {MUSCLE_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <input
              className="input text-center"
              type="number"
              min={1}
              value={sets}
              onChange={(e) => setSets(Number(e.target.value) || 1)}
              aria-label="Sets"
            />
            <span className="text-muted">sets</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              className="input text-center"
              value={repTarget}
              onChange={(e) => setRepTarget(e.target.value)}
              placeholder="8-12"
              aria-label="Rep target"
            />
            <span className="text-muted">reps</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              className="input text-center"
              value={rirTarget}
              onChange={(e) => setRirTarget(e.target.value)}
              placeholder="2"
              aria-label="RIR target"
            />
            <span className="text-muted">RIR</span>
          </div>
          <button className="btn-accent" onClick={add}>
            + Add
          </button>
        </div>
      </div>
    </div>
  );
}
