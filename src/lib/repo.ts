import { db, uid } from "./db";
import type {
  Exercise,
  Mesocycle,
  Day,
  PlannedExercise,
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
  opts: {
    targetSets?: number;
    repLow?: number;
    repHigh?: number;
    targetRir?: number;
    note?: string;
  } = {},
): Promise<PlannedExercise> {
  const count = await db().plannedExercises.where("dayId").equals(dayId).count();
  const pe: PlannedExercise = {
    id: uid(),
    dayId,
    exerciseId,
    order: count,
    targetSets: opts.targetSets ?? 3,
    repLow: opts.repLow,
    repHigh: opts.repHigh,
    targetRir: opts.targetRir,
    note: opts.note,
  };
  await db().plannedExercises.add(pe);
  return pe;
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
    for (let i = 0; i < pe.targetSets; i++) {
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
