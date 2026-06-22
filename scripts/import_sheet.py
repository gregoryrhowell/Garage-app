#!/usr/bin/env python3
"""Parse a coaching-template workout spreadsheet (.xlsx) into the app's import JSON.

These sheets use a consistent layout per training-day tab:
  - Weeks run across in column groups: Week 1 = cols D-G, Week 2 = I-L, Week 3 = N-Q.
  - Each exercise is a block: header row (col D == "Set"), a prescription row
    (target Sets / Reps / RIR), a Load/Reps/RIR label row, then up to 5 set rows.
  - Coaching metadata (tempo, rest, coach note, demo video hyperlink) sits in
    cols B/C of the block.

Quirks handled:
  - Google auto-converts rep/RIR ranges like "8-12" / "2-3" into dates; we
    reverse those (a date M/D -> "M-D").
  - Logged reps can encode myo-rep clusters: "12.4.2" = 12 reps + 4 + 2 myo,
    "10-2" = 10 + 2 myo (dots/slashes prevent Google date-coercion). We keep the
    raw text, the primary rep, and the myo list.

Usage:
  python3 scripts/import_sheet.py <input.xlsx> <output.json> \
      [--name "Display Name"] [--source "Sheet Title"] [--coach email] [--weeks 3]
"""
import argparse
import datetime
import json
import re
import sys

try:
    import openpyxl
except ImportError:
    sys.exit("openpyxl is required: pip install openpyxl")

# Training-day tabs to parse (skip instructional tabs).
DEFAULT_SKIP = {"Weekly Instructions", "Tempo Tab"}
WEEK_COLS = {1: (4, 5, 6, 7), 2: (9, 10, 11, 12), 3: (14, 15, 16, 17)}

MUSCLE_RULES = [
    ("Calves", ["calf", "calve"]),
    ("Abs", ["crunch", "ab machine", "rope crunch", "oblique", "abdominal"]),
    ("Glutes", ["glute", "hyper", "bulgarian", "hip thrust", "thrust"]),
    # Hamstrings before Biceps so "leg curl" wins over the bare "curl".
    ("Hamstrings", ["hamstring", "leg curl", "stiff leg", "rdl", "romanian", "sldl"]),
    ("Biceps", ["curl", "bicep", "preacher"]),
    ("Triceps", ["tricep", "pushdown", "skull", "kickback"]),
    ("Quads", ["squat", "leg press", "leg extension", "adductor", "adduct", "lunge"]),
    ("Back", ["row", "pulldown", "pullover", "pull-up", "pullup", "pull up",
              "lat ", "face pull", "facepull", "meadows", "pull"]),
    ("Shoulders", ["shoulder", "lateral", "ohp", "overhead", "delt", "rear", "face"]),
    ("Chest", ["bench", "chest", "pec", "fly", "decline", "incline", "press"]),
]


def dec(v):
    """Decode a cell value, reversing Google's date-coercion of numeric ranges."""
    if isinstance(v, (datetime.datetime, datetime.date)):
        return f"{v.month}-{v.day}"
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    if v is None:
        return None
    return str(v).strip()


def pretty_day(t):
    if t == "HamsGlutes":
        return "Hams / Glutes"
    if " " in t or t in ("Quads", "Accessory"):
        return t
    return " / ".join(re.sub(r"(?<=[a-z])(?=[A-Z])", " ", t).split())


def muscle(name):
    n = name.lower()
    for mg, kws in MUSCLE_RULES:
        if any(k in n for k in kws):
            return mg
    return "Other"


def parse_weight(v):
    s = dec(v)
    if s is None:
        return None, None
    try:
        f = float(s.rstrip(", ").strip())
        return (int(f) if f.is_integer() else f), None
    except ValueError:
        return None, s


def parse_reps(v):
    s = dec(v)
    if s is None:
        return None, None, None
    if re.fullmatch(r"\d+", s):
        return int(s), None, None
    m = re.fullmatch(r"(\d+)-(\d+)", s)
    if m and int(m.group(2)) > int(m.group(1)):  # ascending range, not myo
        return int(m.group(1)), None, s
    parts = [p for p in re.split(r"[./-]", s) if re.fullmatch(r"\d+", p)]
    if len(parts) >= 2:
        return int(parts[0]), [int(x) for x in parts[1:]], s
    if parts:
        return int(parts[0]), None, s
    return None, None, s


def parse_rir(v):
    s = dec(v)
    if s is None:
        return None, None
    try:
        f = float(s)
        return (int(f) if f.is_integer() else f), None
    except ValueError:
        return None, s


def parse_workbook(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    wbh = openpyxl.load_workbook(path, data_only=False)  # for hyperlinks
    days = []
    for ws in wb.worksheets:
        # A training-day tab has at least one block header (col D == "Set").
        headers = [r for r in range(1, ws.max_row + 1)
                   if str(ws.cell(r, 4).value).strip() == "Set"]
        if not headers or ws.title in DEFAULT_SKIP:
            continue
        wsh = wbh[ws.title]
        exercises = []
        for hi, R in enumerate(headers):
            name = dec(ws.cell(R, 2).value)
            if not name:
                continue
            try:
                order = int(float(ws.cell(R, 1).value))
            except (TypeError, ValueError):
                order = hi + 1
            end = headers[hi + 1] - 1 if hi + 1 < len(headers) else ws.max_row

            tempo = rest = coach_note = video = alt = None
            for r in range(R + 1, min(end, R + 12) + 1):
                b = str(ws.cell(r, 2).value or "").strip()
                c = dec(ws.cell(r, 3).value)
                if b.startswith("Tempo"):
                    tempo = c
                elif b.startswith("Rest"):
                    rest = c
                elif b.startswith("Your Notes"):
                    pass
                elif b and not b.startswith("Set"):
                    if alt is None:
                        alt = b
                    if c and not coach_note:
                        coach_note = c
                    hl = wsh.cell(r, 2).hyperlink
                    if hl and not video:
                        video = hl.target
            alt = re.sub(r"^Notes?:\s*", "", alt).strip() if alt else None
            if alt and alt.startswith("http"):
                alt = None

            weeks = []
            for wk, (scol, lcol, rpcol, ricol) in WEEK_COLS.items():
                if lcol > ws.max_column:
                    continue
                try:
                    target_sets = int(float(ws.cell(R + 1, lcol).value))
                except (TypeError, ValueError):
                    target_sets = None
                rep_target = dec(ws.cell(R + 1, rpcol).value)
                rir_target = dec(ws.cell(R + 1, ricol).value)
                sets = []
                si = 0
                for r in range(R + 3, min(end, R + 9) + 1):
                    load = ws.cell(r, lcol).value
                    reps = ws.cell(r, rpcol).value
                    rir = ws.cell(r, ricol).value
                    label = dec(ws.cell(r, scol).value)
                    if all(x is None for x in (load, reps, rir)):
                        continue
                    w, wraw = parse_weight(load)
                    rp, myo, rpraw = parse_reps(reps)
                    ri, riraw = parse_rir(rir)
                    s = {"setIndex": si}
                    if w is not None:
                        s["weight"] = w
                    if wraw:
                        s["rawWeight"] = wraw
                    if rp is not None:
                        s["reps"] = rp
                    if rpraw:
                        s["rawReps"] = rpraw
                    if myo:
                        s["myoReps"] = myo
                    if ri is not None:
                        s["rir"] = ri
                    if riraw:
                        s["rawRir"] = riraw
                    if label and not label.isdigit():
                        s["label"] = label
                    sets.append(s)
                    si += 1
                w = {"week": wk}
                if target_sets is not None:
                    w["targetSets"] = target_sets
                if rep_target:
                    w["repTarget"] = rep_target
                if rir_target:
                    w["rirTarget"] = rir_target
                w["sets"] = sets
                weeks.append(w)

            ex = {"order": order, "name": name, "muscleGroup": muscle(name)}
            if alt and alt.lower() != name.lower():
                ex["altName"] = alt
            if tempo:
                ex["tempo"] = tempo
            if rest:
                ex["rest"] = rest
            if coach_note:
                ex["coachNote"] = coach_note
            if video:
                ex["videoUrl"] = video
            ex["weeks"] = weeks
            exercises.append(ex)
        days.append({"name": pretty_day(ws.title), "exercises": exercises})
    return days


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--name", required=True)
    ap.add_argument("--source", help="original sheet title (defaults to --name)")
    ap.add_argument("--coach")
    ap.add_argument("--weeks", type=int, default=3)
    ap.add_argument("--note")
    args = ap.parse_args()

    days = parse_workbook(args.input)
    parsed = {
        "source": args.source or args.name,
        "name": args.name,
        "weeks": args.weeks,
        "days": days,
    }
    if args.coach:
        parsed["coach"] = args.coach
    if args.note:
        parsed["note"] = args.note

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(parsed, f, indent=2, ensure_ascii=False)

    n_ex = sum(len(d["exercises"]) for d in days)
    n_sets = sum(len(w["sets"]) for d in days for e in d["exercises"] for w in e["weeks"])
    print(f"Wrote {args.output}: {len(days)} days, {n_ex} exercises, {n_sets} logged sets")


if __name__ == "__main__":
    main()
