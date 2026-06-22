// Core domain types for the workout tracker.
// Modeled on a standard mesocycle structure:
//   Mesocycle (a spreadsheet) -> Days (training days) -> Planned Exercises
//   Each week you run the Days, logging Sets (weight / reps / RIR).

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

// A mesocycle = one of your old spreadsheets.
export interface Mesocycle {
  id: string;
  name: string;
  weeks: number; // planned length, e.g. 4-6 weeks
  startDate?: string; // ISO date
  createdAt: number;
  archived: boolean;
  notes?: string;
}

// A training day template within a mesocycle, e.g. "Push", "Pull", "Legs".
export interface Day {
  id: string;
  mesoId: string;
  name: string;
  order: number;
}

// A planned exercise slot inside a Day (the prescription).
export interface PlannedExercise {
  id: string;
  dayId: string;
  exerciseId: string;
  order: number;
  targetSets: number;
  repLow?: number;
  repHigh?: number;
  targetRir?: number; // reps in reserve target
  note?: string;
}

// An actual instance of running a Day in a given week.
export interface Session {
  id: string;
  mesoId: string;
  dayId: string;
  week: number; // 1-indexed
  date: string; // ISO date
  startedAt: number;
  completedAt?: number;
  note?: string;
}

// A single logged set.
export interface SetLog {
  id: string;
  sessionId: string;
  plannedExerciseId: string;
  exerciseId: string;
  setIndex: number; // 0-indexed within the exercise for this session
  weight?: number;
  reps?: number;
  rir?: number;
  done: boolean;
}
