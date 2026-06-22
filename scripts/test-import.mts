// Runtime smoke test for the import pipeline against a real IndexedDB shim.
// Verifies the Dexie schema, importMeso(), and re-import guard end to end.
import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";

// db() guards against running outside a browser; pretend we're in one.
(globalThis as unknown as { window: unknown }).window = globalThis;

const { importMeso, isAlreadyImported } = await import("../src/lib/import/importMeso.ts");
const { db } = await import("../src/lib/db.ts");

const parsed = JSON.parse(
  readFileSync("public/imports/gh-cozy-season-arc-i.json", "utf8"),
);

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
}

const before = await isAlreadyImported(parsed.source);
assert(before === false, "should not be imported yet");

const res = await importMeso(parsed);
console.log("import result:", res);
assert(res.days === 5, `expected 5 days, got ${res.days}`);
assert(res.exercises === 26, `expected 26 exercises, got ${res.exercises}`);
assert(res.sets === 172, `expected 172 sets, got ${res.sets}`);

// Re-import guard
assert((await isAlreadyImported(parsed.source)) === true, "should now be imported");

// Spot-check the model wrote through correctly.
const meso = await db().mesocycles.get(res.mesoId);
assert(meso?.source === parsed.source, "meso.source set");
assert(meso?.coach === parsed.coach, "meso.coach set");

const days = await db().days.where("mesoId").equals(res.mesoId).toArray();
assert(days.length === 5, "5 day rows");

// Sessions: one per (day, week) that has logged sets. 5 days x up to 3 weeks.
const sessions = await db().sessions.where("mesoId").equals(res.mesoId).toArray();
console.log("sessions created:", sessions.length);
assert(sessions.every((s) => s.completedAt && s.note === "Imported"), "imported sessions completed");

// Week prescriptions exist and a myo set round-tripped.
const allSets = await db().sets.toArray();
const myo = allSets.find((s) => s.rawReps === "12.4.2");
assert(myo, "12.4.2 set present");
assert(myo!.reps === 12 && JSON.stringify(myo!.myoReps) === "[4,2]", "myo parsed 12 + [4,2]");

const wp = await db().weekPrescriptions.toArray();
console.log("week prescriptions:", wp.length);
assert(wp.length > 0, "week prescriptions written");

// A planned exercise carries the coaching layer.
const planned = await db().plannedExercises.toArray();
const withVideo = planned.filter((p) => p.videoUrl).length;
const withTempo = planned.filter((p) => p.tempo).length;
console.log(`planned exercises: ${planned.length} (video:${withVideo} tempo:${withTempo})`);
assert(withVideo > 10, "video links preserved");

console.log("\n✅ All import assertions passed.");
