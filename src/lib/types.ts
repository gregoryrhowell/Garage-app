// Core domain types for the workout tracker.
// Modeled on how the coaching spreadsheets actually work:
//   Mesocycle (a spreadsheet) -> Day (a tab / training day) -> Planned Exercise
//   Each exercise carries a coaching layer (tempo, rest, notes, video) and a
//   per-week prescription. Each week you run the Day as a Session, logging Sets.

export type MuscleGroup =
  | "Chest"
  | "Back"
  | "Shoulders"
  | "Biceps"
  | "Triceps"
  | "Quads"
  | "Hamstrings"
  | "Glutes"
  | "Calves"
  | "Abs"
  | "Forearms"
  | "Traps"
  | "Other";

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Abs",
  "Forearms",
  "Traps",
  "Other",
];

// Reusable exercise from the library (shared across mesocycles).
export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
}

// A mesocycle = one of the old spreadsheets.
export interface Mesocycle {
  id: string;
  name: string;
  weeks: number; // number of week-columns in the block
  startDate?: string; // ISO date
  createdAt: number;
  archived: boolean;
  notes?: string;
  source?: string; // original sheet title, used to avoid double-imports
  coach?: string;
}

// A training day template within a mesocycle, e.g. "Chest / Shoulders / Triceps".
export interface Day {
  id: string;
  mesoId: string;
  name: string;
  order: number;
}

// A planned exercise slot inside a Day. Holds the coaching layer that is
// constant across weeks; per-week numbers live in WeekPrescription.
export interface PlannedExercise {
  id: string;
  dayId: string;
  exerciseId: string;
  order: number;
  targetSets: number; // default set count (fallback when seeding a session)
  repTarget?: string; // e.g. "8-12", "8+", "RX"
  rirTarget?: string; // e.g. "2-3", "0", "RPE 8"
  altName?: string; // coach's machine/variation name
  tempo?: string; // e.g. "2-1-0-1"
  rest?: string; // e.g. "2 - 3 min"
  coachNote?: string;
  videoUrl?: string;
}

// Per-week prescription override for a planned exercise.
export interface WeekPrescription {
  id: string;
  plannedExerciseId: string;
  week: number; // 1-indexed
  targetSets?: number;
  repTarget?: string;
  rirTarget?: string;
}

// An actual instance of running a Day in a given week.
export interface Session {
  id: string;
  mesoId: string;
  dayId: string;
  week: number; // 1-indexed
  date?: string; // ISO date; absent for imported historical data
  startedAt: number;
  completedAt?: number;
  note?: string;
}

// A single logged set. Numeric fields are the primary values used for charts;
// raw* / myoReps preserve the original spreadsheet text exactly.
export interface SetLog {
  id: string;
  sessionId: string;
  plannedExerciseId: string;
  exerciseId: string;
  setIndex: number; // 0-indexed within the exercise for this session
  weight?: number;
  reps?: number; // primary rep count
  rir?: number;
  done: boolean;
  rawWeight?: string;
  rawReps?: string; // original text, e.g. "12.4.2"
  myoReps?: number[]; // myo-rep clusters, e.g. [4, 2]
  rawRir?: string; // e.g. "RPE 8"
  label?: string; // set marker, e.g. "Myo-Reps"
  note?: string;
}
