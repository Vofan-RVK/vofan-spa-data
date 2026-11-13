#!/usr/bin/env python3
"""
Vofan spáreiknir v1  —  polls/ -> public/forecast.json
=====================================================

Reads every poll file in polls/, computes the widget's input numbers and
writes public/forecast.json. The heavy simulation (seat allocation,
equalisation seats, 3000 draws) runs in the visitor's browser; this script
only produces the polling-average inputs it consumes.

v1 model (deliberately minimal, to be replaced by the fuller model we are
building): for each constituency, an exponentially recency-weighted
average over all constituency polls, with a 45-day half-life measured from
the newest poll in the dataset. No house effects, no trend, no
time-to-election uncertainty scaling yet — those are the next steps.

Run:  python3 model/model.py   (from the repo root or from model/)
"""

import datetime as dt
import json
import math
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
POLLS_DIR = ROOT / "polls"
OUT_PATH = ROOT / "public" / "forecast.json"

PARTIES = ["B", "C", "D", "F", "J", "M", "P", "S", "V", "O"]  # O = onnt/ógilt
CONSTITUENCIES = ["rvkn", "rvks", "sv", "nv", "na", "s"]
HALF_LIFE_DAYS = 45.0
SIGMA_NAT = 2.0
SIGMA_DIST = 1.4
SUM_TOLERANCE = 1.5  # constituency values must sum to 100 +- this

def load_polls():
    files = sorted(POLLS_DIR.glob("*.json"))
    if not files:
        sys.exit("ERROR: no poll files found in polls/")
    polls = []
    for f in files:
        p = json.loads(f.read_text(encoding="utf-8"))
        p["_file"] = f.name
        polls.append(p)
    return polls

def validate(polls):
    for p in polls:
        for key in ("pollster", "published", "scope"):
            if key not in p:
                sys.exit(f"ERROR: {p['_file']} is missing '{key}'")
        dt.date.fromisoformat(p["published"])  # raises on bad dates
        if p["scope"] != "constituency":
            sys.exit(f"ERROR: {p['_file']}: scope '{p['scope']}' is not "
                     "supported by model v1 yet (only 'constituency')")
        values = p.get("values")
        if not isinstance(values, dict):
            sys.exit(f"ERROR: {p['_file']} has no 'values' object")
        missing_c = [c for c in CONSTITUENCIES if c not in values]
        if missing_c:
            sys.exit(f"ERROR: {p['_file']} is missing constituencies: "
                     f"{', '.join(missing_c)}")
        for c in CONSTITUENCIES:
            row = values[c]
            missing = [b for b in PARTIES if b not in row]
            if missing:
                sys.exit(f"ERROR: {p['_file']} / {c} is missing parties: "
                         f"{', '.join(missing)}")
            total = sum(row[b] for b in PARTIES)
            if abs(total - 100.0) > SUM_TOLERANCE:
                sys.exit(f"ERROR: {p['_file']} / {c} sums to {total:.1f}, "
                         f"expected 100 +- {SUM_TOLERANCE}")

def model_v1(polls):
    """Recency-weighted average per constituency, per party."""
    ref = max(dt.date.fromisoformat(p["published"]) for p in polls)
    sums = {c: {b: 0.0 for b in PARTIES} for c in CONSTITUENCIES}
    wsums = {c: 0.0 for c in CONSTITUENCIES}
    for p in polls:
        days = (ref - dt.date.fromisoformat(p["published"])).days
        w = 0.5 ** (days / HALF_LIFE_DAYS)
        for c in CONSTITUENCIES:
            for b in PARTIES:
                sums[c][b] += w * p["values"][c][b]
            wsums[c] += w
    out = {}
    for c in CONSTITUENCIES:
        out[c] = {b: round(sums[c][b] / wsums[c], 2) for b in PARTIES}
    return out, ref

def main():
    polls = load_polls()
    validate(polls)
    constituencies, latest = model_v1(polls)

    forecast = {
        "schema": 1,
        "lastUpdated": latest.isoformat(),
        "constituencies": constituencies,
        "uncertainty": {"sigmaNat": SIGMA_NAT, "sigmaDist": SIGMA_DIST},
        "sources": [
            {
                "pollster": p["pollster"],
                "series": p.get("series"),
                "published": p["published"],
            }
            for p in sorted(polls, key=lambda x: x["published"])
        ],
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(forecast, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    # human-readable summary for the action log
    print(f"Polls read: {len(polls)}")
    for p in polls:
        print(f"  - {p['_file']}: {p['pollster']} {p.get('series') or ''} "
              f"({p['published']})")
    print(f"\nlastUpdated: {latest.isoformat()}\n")
    header = "kjördæmi  " + "  ".join(f"{b:>5}" for b in PARTIES)
    print(header)
    for c in CONSTITUENCIES:
        row = constituencies[c]
        print(f"{c:<9} " + "  ".join(f"{row[b]:>5.1f}" for b in PARTIES))
    print(f"\nWrote {OUT_PATH.relative_to(ROOT)}")

if __name__ == "__main__":
    main()
