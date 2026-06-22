import { db, uid } from "../db";
import {
  createMesocycle,
  addDay,
  addPlannedExercise,
  getOrCreateExercise,
  setWeekPrescription,
} from "../repo";
import type { Session, SetLog } from "../types";
import type { ParsedMeso } from "./format";

export interface ImportResult {
  mesoId: string;
  days: number;
  exercises: number;
  sets: number;
}

// Has this sheet already been imported?
export async function isAlreadyImported(source: string): Promise<boolean> {
  const hit = await db().mesocycles.where("source").equals(source).first();
  return !!hit;
}

// Write a parsed spreadsheet into the on-device database. Historical logged
// sets are marked done and their sessions completed.
export async function importMeso(parsed: ParsedMeso): Promise<ImportResult> {
  const meso = await createMesocycle(parsed.name, parsed.weeks);
  await db().mesocycles.update(meso.id, {
    source: parsed.source,
    coach: parsed.coach,
    notes: parsed.note,
  });

  let exCount = 0;
  let setCount = 0;

  for (const day of parsed.days) {
    const dayRow = await addDay(meso.id, day.name);
    // One session per (day, week); exercises share it.
    const sessionByWeek = new Map<number, Session>();

    const ordered = [...day.exercises].sort((a, b) => a.order - b.order);
    for (let i = 0; i < ordered.length; i++) {
      const ex = ordered[i];
      const exercise = await getOrCreateExercise(ex.name, ex.muscleGroup);
      const week1 = ex.weeks.find((w) => w.week === 1);
      const pe = await addPlannedExercise(dayRow.id, exercise.id, {
        order: i,
        targetSets: week1?.targetSets ?? ex.weeks[0]?.targetSets ?? 3,
        repTarget: week1?.repTarget,
        rirTarget: week1?.rirTarget,
        altName: ex.altName,
        tempo: ex.tempo,
        rest: ex.rest,
        coachNote: ex.coachNote,
        videoUrl: ex.videoUrl,
      });
      exCount++;

      for (const wk of ex.weeks) {
        await setWeekPrescription(pe.id, wk.week, {
          targetSets: wk.targetSets,
          repTarget: wk.repTarget,
          rirTarget: wk.rirTarget,
        });

        if (wk.sets.length === 0) continue;

        let session = sessionByWeek.get(wk.week);
        if (!session) {
          session = {
            id: uid(),
            mesoId: meso.id,
            dayId: dayRow.id,
            week: wk.week,
            startedAt: Date.now(),
            completedAt: Date.now(),
            note: "Imported",
          };
          await db().sessions.add(session);
          sessionByWeek.set(wk.week, session);
        }

        const rows: SetLog[] = wk.sets.map((s) => ({
          id: uid(),
          sessionId: session!.id,
          plannedExerciseId: pe.id,
          exerciseId: exercise.id,
          setIndex: s.setIndex,
          weight: s.weight,
          reps: s.reps,
          rir: s.rir,
          rawWeight: s.rawWeight,
          rawReps: s.rawReps,
          myoReps: s.myoReps,
          rawRir: s.rawRir,
          label: s.label,
          done: true,
        }));
        await db().sets.bulkAdd(rows);
        setCount += rows.length;
      }
    }
  }

  return {
    mesoId: meso.id,
    days: parsed.days.length,
    exercises: exCount,
    sets: setCount,
  };
}
