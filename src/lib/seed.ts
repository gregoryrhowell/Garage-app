import { db } from "./db";
import {
  createMesocycle,
  addDay,
  addPlannedExercise,
  getOrCreateExercise,
} from "./repo";
import type { MuscleGroup } from "./types";

// A starter mesocycle so the app has something to show before you import
// your own spreadsheets. Runs once (only when the DB is empty).
const TEMPLATE: {
  day: string;
  exercises: [string, MuscleGroup, number, number, number][]; // name, muscle, sets, repLow, repHigh
}[] = [
  {
    day: "Push",
    exercises: [
      ["Barbell Bench Press", "Chest", 4, 6, 8],
      ["Incline Dumbbell Press", "Chest", 3, 8, 12],
      ["Overhead Press", "Shoulders", 3, 6, 10],
      ["Cable Lateral Raise", "Shoulders", 3, 12, 20],
      ["Triceps Pushdown", "Triceps", 3, 10, 15],
    ],
  },
  {
    day: "Pull",
    exercises: [
      ["Deadlift", "Back", 3, 4, 6],
      ["Pull-Up", "Back", 3, 6, 12],
      ["Chest-Supported Row", "Back", 3, 8, 12],
      ["Face Pull", "Shoulders", 3, 12, 20],
      ["Barbell Curl", "Biceps", 3, 8, 12],
    ],
  },
  {
    day: "Legs",
    exercises: [
      ["Back Squat", "Quads", 4, 5, 8],
      ["Romanian Deadlift", "Hamstrings", 3, 8, 12],
      ["Leg Press", "Quads", 3, 10, 15],
      ["Seated Leg Curl", "Hamstrings", 3, 10, 15],
      ["Standing Calf Raise", "Calves", 4, 10, 15],
    ],
  },
];

export async function seedIfEmpty(): Promise<void> {
  const count = await db().mesocycles.count();
  if (count > 0) return;

  const meso = await createMesocycle("Sample Meso — PPL", 5);
  for (const block of TEMPLATE) {
    const day = await addDay(meso.id, block.day);
    for (const [name, muscle, sets, repLow, repHigh] of block.exercises) {
      const ex = await getOrCreateExercise(name, muscle);
      await addPlannedExercise(day.id, ex.id, {
        targetSets: sets,
        repLow,
        repHigh,
        targetRir: 2,
      });
    }
  }
}
