import type { MuscleGroup } from "../types";

// Portable JSON shape produced from a coaching spreadsheet. Bundled files live
// in /public/imports and are also what a future uploader would emit.

export interface ParsedSet {
  setIndex: number;
  weight?: number;
  rawWeight?: string;
  reps?: number;
  rawReps?: string;
  myoReps?: number[];
  rir?: number;
  rawRir?: string;
  label?: string;
}

export interface ParsedWeek {
  week: number;
  targetSets?: number;
  repTarget?: string;
  rirTarget?: string;
  sets: ParsedSet[];
}

export interface ParsedExercise {
  order: number;
  name: string;
  muscleGroup: MuscleGroup;
  altName?: string;
  tempo?: string;
  rest?: string;
  coachNote?: string;
  videoUrl?: string;
  weeks: ParsedWeek[];
}

export interface ParsedDay {
  name: string;
  exercises: ParsedExercise[];
}

export interface ParsedMeso {
  source: string;
  name: string;
  coach?: string;
  weeks: number;
  note?: string;
  days: ParsedDay[];
}

// Manifest of bundled sample imports shown on the Import screen.
export interface ImportManifestEntry {
  file: string;
  source: string;
  name: string;
  summary: string;
}
