import Dexie, { type Table } from "dexie";
import type {
  Exercise,
  Mesocycle,
  Day,
  PlannedExercise,
  WeekPrescription,
  Session,
  SetLog,
} from "./types";

// Offline-first, on-device store. Everything lives in the browser (IndexedDB)
// so the app works in the gym with no signal and no login.
export class GarageDB extends Dexie {
  exercises!: Table<Exercise, string>;
  mesocycles!: Table<Mesocycle, string>;
  days!: Table<Day, string>;
  plannedExercises!: Table<PlannedExercise, string>;
  weekPrescriptions!: Table<WeekPrescription, string>;
  sessions!: Table<Session, string>;
  sets!: Table<SetLog, string>;

  constructor() {
    super("garage-app");
    this.version(1).stores({
      exercises: "id, name, muscleGroup",
      mesocycles: "id, createdAt, archived",
      days: "id, mesoId, order",
      plannedExercises: "id, dayId, exerciseId, order",
      sessions: "id, mesoId, dayId, week, date",
      sets: "id, sessionId, plannedExerciseId, exerciseId",
    });
    // v2 adds per-week prescriptions and a source index on mesocycles.
    this.version(2).stores({
      mesocycles: "id, createdAt, archived, source",
      weekPrescriptions: "id, plannedExerciseId, week",
    });
  }
}

// Lazily instantiate so this module is safe to import in server components.
let _db: GarageDB | null = null;
export function db(): GarageDB {
  if (typeof window === "undefined") {
    throw new Error("db() can only be used in the browser");
  }
  if (!_db) _db = new GarageDB();
  return _db;
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
