#!/usr/bin/env python3
"""
Vofan spáreiknir v2  —  polls/ -> public/forecast.json
=====================================================

Reads every poll file in polls/, computes the widget's input numbers and
writes public/forecast.json. The heavy simulation (seat allocation,
equalisation seats, 3000 draws) runs in the visitor's browser; this script
only produces the polling-average inputs it consumes.

v2 model = recency-weighted average (45-day half-life) x pollster accuracy
weight x same-house de-correlation, then house-effect correction and
national-poll disaggregation:

  * Pollster weights (decided 13 Nov 2026 from the final-poll-vs-result
    record of the 2017/2021/2024 Alþingi elections; Gallup was the most
    accurate final poll in all three, FVS HÍ mid, Maskína worst of the
    three but with only two elections on record):
        Gallup 0.45, FVS HÍ 0.30, Maskína 0.25, unknown houses 0.125
    (an unknown house weighs half of the weakest major until it has a
    track record).

  * House effects: each house's final polls have shown systematic party
    deviations from the actual results (e.g. Maskína under-reading
    Sjálfstæðisflokkurinn by ~4 points, everyone under-reading Flokkur
    fólksins). HOUSE_EFFECT below holds the correction to SUBTRACT from a
    poll's party value, estimated as the mean (poll - result) deviation of
    that house's final polls over 2017/2021/2024 and shrunk 50% to hedge
    against over-correction on a 2-3 election sample. The estimates absorb
    both classical house effects and persistent late-campaign dynamics;
    they must be re-estimated after each election. Parties not listed
    (incl. O = onnt/ógild) get no correction.

  * After correction each constituency row is renormalised to sum 100.

  * National polls: most Icelandic polls are only published nationally.
    A poll file with "scope": "national" carries one flat row of party
    values (sum 100). The model corrects it for house effects and then
    splits it across the six constituencies with the swing method against
    the official result of the last election (anchors/2024-results.json,
    Hagstofa Íslands PxWeb KOS02018): party share in constituency c =
    anchor share in c x (poll national / anchor national). Parties with
    no anchor national share (<= 0.01, e.g. new parties) are spread
    uniformly, then each row is renormalised to 100. Replace the anchor
    file after each election.

  * Same-house de-correlation: consecutive releases from one house share
    sample, method and panel, so they are not independent readings. Each
    poll's weight is multiplied by OVERLAP_DAMP (0.6) for every later poll
    from the same house published within OVERLAP_DAYS (30) days of it;
    the newest release keeps its full weight, each nearby older one loses
    40%.

Still deliberately simple: no trend/late-swing extrapolation and no
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

# ---- v2 calibration constants (re-estimate after each election) -----------

POLLSTER_WEIGHTS = {
    "gallup": 0.45,
    "fvs": 0.30,
    "maskina": 0.25,
}
DEFAULT_WEIGHT = 0.125  # houses without a track record

# canonical spellings we recognise in poll files (lowercased, diacritics
# stripped) -> weight key
POLLSTER_ALIASES = {
    "gallup": "gallup",
    "maskina": "maskina",
    "maskinu": "maskina",
    "fvs": "fvs",
    "fvs hi": "fvs",
    "felagsvisindastofnun": "fvs",
    "felagsvisindastofnun haskola islands": "fvs",
    "felagsvisindastofnun haskola islands": "fvs",
}

# points to SUBTRACT from a poll's party value; = 50% of the house's mean
# (final poll - result) deviation, 2017/2021/2024 national results.
HOUSE_EFFECT = {
    "gallup": {"B": -0.87, "C": 0.70, "D": -0.32, "F": -1.09, "J": 0.50,
               "M": -0.13, "P": 0.19, "S": 0.89, "V": 0.10},
    "maskina": {"B": -0.48, "C": 1.30, "D": -1.98, "F": -1.40, "J": 0.75,
                "M": -0.10, "P": 1.00, "S": 0.88, "V": -0.18},
    "fvs": {"B": -0.30, "C": 0.05, "D": -0.10, "F": -1.50, "J": 1.05,
            "M": -0.90, "P": 0.28, "S": 1.08, "V": 0.78},
}

# last election's official result, used to split national-only polls
# across constituencies (swing method)
ANCHOR_PATH = ROOT / "anchors" / "2024-results.json"

# same-house de-correlation: a poll is damped by OVERLAP_DAMP for every
# later poll from the same house published within OVERLAP_DAYS days
OVERLAP_DAYS = 30
OVERLAP_DAMP = 0.6

# ---------------------------------------------------------------------------


def pollster_key(name):
    # normalise Icelandic diacritics to plain ASCII for matching
    table = str.maketrans("áéíóúýþðæö", "aeiouytdao")
    s = (name or "").strip().lower().translate(table)
    return POLLSTER_ALIASES.get(s)


def house_weight(name):
    key = pollster_key(name)
    if key is None:
        print(f"  NOTE: '{name}' has no accuracy weight yet -> "
              f"default {DEFAULT_WEIGHT}")
        return DEFAULT_WEIGHT
    return POLLSTER_WEIGHTS[key]


def house_correction(name):
    return HOUSE_EFFECT.get(pollster_key(name), {})


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
        if p["scope"] not in ("constituency", "national"):
            sys.exit(f"ERROR: {p['_file']}: scope '{p['scope']}' is not "
                     "supported (use 'constituency' or 'national')")
        values = p.get("values")
        if not isinstance(values, dict):
            sys.exit(f"ERROR: {p['_file']} has no 'values' object")
        if p["scope"] == "national":
            missing = [b for b in PARTIES if b not in values]
            if missing:
                sys.exit(f"ERROR: {p['_file']} is missing parties: "
                         f"{', '.join(missing)}")
            total = sum(values[b] for b in PARTIES)
            if abs(total - 100.0) > SUM_TOLERANCE:
                sys.exit(f"ERROR: {p['_file']} sums to {total:.1f}, "
                         f"expected 100 +- {SUM_TOLERANCE}")
            continue
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


_ANCHOR = None


def load_anchor():
    """Last election's official result; needed only for national polls."""
    global _ANCHOR
    if _ANCHOR is None:
        if not ANCHOR_PATH.exists():
            sys.exit(f"ERROR: anchor file {ANCHOR_PATH} not found. It holds "
                     "the official constituency results of the last "
                     "election and is required to disaggregate "
                     "'scope': 'national' polls.")
        _ANCHOR = json.loads(ANCHOR_PATH.read_text(encoding="utf-8"))
    return _ANCHOR


def corrected_national(p):
    """House-effect-correct the flat national row of a poll, renormalised
    to sum 100."""
    corr = house_correction(p["pollster"])
    row, total = {}, 0.0
    for b in PARTIES:
        v = max(0.0, p["values"][b] - corr.get(b, 0.0))
        row[b] = v
        total += v
    if total > 0:
        row = {b: v * 100.0 / total for b, v in row.items()}
    return row


def swing_disaggregate(nat, anchor):
    """Split a corrected national row across constituencies: each party's
    share in constituency c = anchor share in c x (poll national share /
    anchor national share). Parties with no anchor national share
    (<= 0.01, e.g. new parties) are spread uniformly. Rows renormalised
    to 100."""
    a_nat, a_const = anchor["national"], anchor["constituencies"]
    out = {}
    for c in CONSTITUENCIES:
        row, total = {}, 0.0
        for b in PARTIES:
            base = a_nat.get(b, 0.0)
            if base <= 0.01:
                v = nat.get(b, 0.0)  # new party: uniform across country
            else:
                v = a_const[c].get(b, 0.0) * (nat[b] / base)
            row[b] = v
            total += v
        if total > 0:
            row = {b: v * 100.0 / total for b, v in row.items()}
        out[c] = row
    return out


def corrected_values(p):
    """Apply the house-effect correction to one poll and return its
    per-constituency values. Constituency polls are corrected row by row;
    national polls are corrected on the flat row first and then split
    across constituencies with the swing method. Every row is
    renormalised to sum to exactly 100."""
    if p.get("scope") == "national":
        return swing_disaggregate(corrected_national(p), load_anchor())
    corr = house_correction(p["pollster"])
    out = {}
    for c in CONSTITUENCIES:
        row = {}
        total = 0.0
        for b in PARTIES:
            v = max(0.0, p["values"][c][b] - corr.get(b, 0.0))
            row[b] = v
            total += v
        if total > 0:
            for b in PARTIES:
                row[b] = row[b] * 100.0 / total
        out[c] = row
    return out


def overlap_factor(p, polls):
    """Same-house de-correlation: damp a poll for every later poll from
    the same house published within OVERLAP_DAYS days of it. Consecutive
    releases share sample and method, so they are not independent
    readings; the newest release keeps its full weight."""
    key = pollster_key(p["pollster"])
    if key is None:
        return 1.0
    d0 = dt.date.fromisoformat(p["published"])
    newer = 0
    for q in polls:
        if q is p or pollster_key(q["pollster"]) != key:
            continue
        gap = (dt.date.fromisoformat(q["published"]) - d0).days
        if 0 < gap <= OVERLAP_DAYS:
            newer += 1
    return OVERLAP_DAMP ** newer


def model_v2(polls):
    """Recency x accuracy x overlap weighted average of house-corrected,
    (for national polls) swing-disaggregated polls."""
    ref = max(dt.date.fromisoformat(p["published"]) for p in polls)
    sums = {c: {b: 0.0 for b in PARTIES} for c in CONSTITUENCIES}
    wsums = {c: 0.0 for c in CONSTITUENCIES}
    for p in polls:
        days = (ref - dt.date.fromisoformat(p["published"])).days
        damp = overlap_factor(p, polls)
        w = house_weight(p["pollster"]) * 0.5 ** (days / HALF_LIFE_DAYS) * damp
        vals = corrected_values(p)
        for c in CONSTITUENCIES:
            for b in PARTIES:
                sums[c][b] += w * vals[c][b]
            wsums[c] += w
    out = {}
    for c in CONSTITUENCIES:
        out[c] = {b: round(sums[c][b] / wsums[c], 2) for b in PARTIES}
    return out, ref


def main():
    polls = load_polls()
    validate(polls)
    constituencies, latest = model_v2(polls)

    forecast = {
        "schema": 1,
        "modelVersion": 2,
        "lastUpdated": latest.isoformat(),
        "constituencies": constituencies,
        "uncertainty": {"sigmaNat": SIGMA_NAT, "sigmaDist": SIGMA_DIST},
        "sources": [
            {
                "pollster": p["pollster"],
                "series": p.get("series"),
                "published": p["published"],
                "weight": house_weight(p["pollster"]),
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
        damp = overlap_factor(p, polls)
        extra = f" (damped x{damp:.2f})" if damp < 1.0 else ""
        print(f"  - {p['_file']}: {p['pollster']} {p.get('series') or ''} "
              f"({p['published']}, {p['scope']}) "
              f"weight {house_weight(p['pollster'])}{extra}")
    print(f"\nlastUpdated: {latest.isoformat()}\n")
    header = "kjördæmi  " + "  ".join(f"{b:>5}" for b in PARTIES)
    print(header)
    for c in CONSTITUENCIES:
        row = constituencies[c]
        print(f"{c:<9} " + "  ".join(f"{row[b]:>5.1f}" for b in PARTIES))
    print(f"\nWrote {OUT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
