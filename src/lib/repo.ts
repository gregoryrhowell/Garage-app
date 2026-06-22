import { db, uid } from "./db";
import type {
  Exercise,
  Mesocycle,
  Day,
  PlannedExercise,
  WeekPrescription,
  Session,
  SetLog,
  MuscleGroup,
} from "./types";

// --- Exercise library ---------------------------------------------------

export async function getOrCreateExercise(
  name: string,
  muscleGroup: MuscleGroup,
): Promise<Exercise> {
  const trimmed = name.trim();
  const existing = await db()
    .exercises.filter((e) => e.name.toLowerCase() === trimmed.toLowerCase())
    .first();
  if (existing) return existing;
  const ex: Exercise = { id: uid(), name: trimmed, muscleGroup };
  await db().exercises.add(ex);
  return ex;
}

// --- Mesocycles ---------------------------------------------------------

export async function createMesocycle(
  name: string,
  weeks: number,
  startDate?: string,
): Promise<Mesocycle> {
  const meso: Mesocycle = {
    id: uid(),
    name: name.trim(),
    weeks,
    startDate,
    createdAt: Date.now(),
    archived: false,
  };
  await db().mesocycles.add(meso);
  return meso;
}

export async function addDay(mesoId: string, name: string): Promise<Day> {
  const count = await db().days.where("mesoId").equals(mesoId).count();
  const day: Day = { id: uid(), mesoId, name: name.trim(), order: count };
  await db().days.add(day);
  return day;
}

export async function addPlannedExercise(
  dayId: string,
  exerciseId: string,
  opts: Partial<Omit<PlannedExercise, "id" | "dayId" | "exerciseId" | "order">> & {
    order?: number;
  } = {},
): Promise<PlannedExercise> {
  const count = await db().plannedExercises.where("dayId").equals(dayId).count();
  const pe: PlannedExercise = {
    id: uid(),
    dayId,
    exerciseId,
    order: opts.order ?? count,
    targetSets: opts.targetSets ?? 3,
    repTarget: opts.repTarget,
    rirTarget: opts.rirTarget,
    altName: opts.altName,
    tempo: opts.tempo,
    rest: opts.rest,
    coachNote: opts.coachNote,
    videoUrl: opts.videoUrl,
  };
  await db().plannedExercises.add(pe);
  return pe;
}

export async function setWeekPrescription(
  plannedExerciseId: string,
  week: number,
  presc: { targetSets?: number; repTarget?: string; rirTarget?: string },
): Promise<WeekPrescription> {
  const wp: WeekPrescription = {
    id: uid(),
    plannedExerciseId,
    week,
    ...presc,
  };
  await db().weekPrescriptions.add(wp);
  return wp;
}

export async function getWeekPrescriptions(
  plannedExerciseId: string,
): Promise<WeekPrescription[]> {
  return db()
    .weekPrescriptions.where("plannedExerciseId")
    .equals(plannedExerciseId)
    .toArray();
}

export async function getDays(mesoId: string): Promise<Day[]> {
  const days = await db().days.where("mesoId").equals(mesoId).toArray();
  return days.sort((a, b) => a.order - b.order);
}

export async function getPlannedExercises(dayId: string): Promise<PlannedExercise[]> {
  const list = await db().plannedExercises.where("dayId").equals(dayId).toArray();
  return list.sort((a, b) => a.order - b.order);
}

// --- Sessions (live logging) -------------------------------------------

// Find an in-progress session for this day/week, or start a new one and
// pre-create empty set rows from the day's prescription.
export async function startOrResumeSession(
  mesoId: string,
  dayId: string,
  week: number,
): Promise<Session> {
  const existing = await db()
    .sessions.where({ dayId })
    .and((s) => s.mesoId === mesoId && s.week === week && !s.completedAt)
    .first();
  if (existing) return existing;

  const session: Session = {
    id: uid(),
    mesoId,
    dayId,
    week,
    date: new Date().toISOString().slice(0, 10),
    startedAt: Date.now(),
  };
  await db().sessions.add(session);

  // Seed empty sets from the prescription so logging is just tapping in numbers.
  const planned = await getPlannedExercises(dayId);
  const rows: SetLog[] = [];
  for (const pe of planned) {
    const wp = await db()
      .weekPrescriptions.where("plannedExerciseId")
      .equals(pe.id)
      .and((w) => w.week === week)
      .first();
    const setCount = wp?.targetSets ?? pe.targetSets;
    for (let i = 0; i < setCount; i++) {
      rows.push({
        id: uid(),
        sessionId: session.id,
        plannedExerciseId: pe.id,
        exerciseId: pe.exerciseId,
        setIndex: i,
        done: false,
      });
    }
  }
  if (rows.length) await db().sets.bulkAdd(rows);
  return session;
}

export async function getSessionSets(sessionId: string): Promise<SetLog[]> {
  const list = await db().sets.where("sessionId").equals(sessionId).toArray();
  return list.sort((a, b) => a.setIndex - b.setIndex);
}

export async function updateSet(id: string, patch: Partial<SetLog>): Promise<void> {
  await db().sets.update(id, patch);
}

export async function addSetToExercise(
  sessionId: string,
  plannedExerciseId: string,
  exerciseId: string,
): Promise<SetLog> {
  const existing = await db()
    .sets.where({ sessionId })
    .and((s) => s.plannedExerciseId === plannedExerciseId)
    .toArray();
  const setIndex = existing.length;
  const set: SetLog = {
    id: uid(),
    sessionId,
    plannedExerciseId,
    exerciseId,
    setIndex,
    done: false,
  };
  await db().sets.add(set);
  return set;
}

export async function removeSet(id: string): Promise<void> {
  await db().sets.delete(id);
}

export async function completeSession(sessionId: string): Promise<void> {
  await db().sessions.update(sessionId, { completedAt: Date.now() });
}
