# Vofan spágögn — poll data pipeline for Kosningaspá Vofunnar

Poll data and forecast-input pipeline for the 2028 Alþingi election
forecast widget on vofan.org.

**Public by design.** This repository contains only public poll numbers
and the small model that turns them into the widget's input. Never put
drafts, notes, or anything identifying here. All commits happen through
the `Vofan-RVK` account, never a personal one.

## How it updates the widget

1. A new poll arrives. Add one file under `polls/` (see schema below).
2. Commit to `main`. The **Reikna spá** action runs `model/model.py`,
   which rewrites `public/forecast.json` and commits it back.
3. The widget on vofan.org fetches that file on every page load:

   ```
   https://raw.githubusercontent.com/Vofan-RVK/vofan-spa-data/main/public/forecast.json
   ```

   (raw.githubusercontent.com serves with `Access-Control-Allow-Origin: *`
   and 5-minute caching, so updates reach visitors within minutes.)

4. The widget reads `lastUpdated` and renders the line
   `Uppfært 3. nóvember 2026.` with Icelandic month names.

No server, no database account, nothing beyond GitHub itself. The heavy
part of the calculator (d'Hondt seat allocation, equalisation seats,
3000-draw simulation) runs in the visitor's browser; only the polling
averages and the timestamp travel through this repo.

## Layout

| Path | Contents |
|---|---|
| `polls/` | One JSON file per pollster release (append-only, never edited or deleted) |
| `model/model.py` | The prediction model: `polls/` -> `public/forecast.json` |
| `anchors/2024-results.json` | Official 2024 result per constituency (Hagstofa Íslands KOS02018); splits national polls across constituencies |
| `public/forecast.json` | Published output; only the action writes here |
| `.github/workflows/publish.yml` | Recompute + publish on every change to `polls/` or `model/` |

## Poll file schema

File name: `YYYY-MM-DD-<pollster>.json` (date = publication date).

```json
{
  "pollster": "Gallup",
  "series": "Þjóðarpúlsinn",
  "published": "2026-11-03",
  "fieldwork": { "start": "2026-10-21", "end": "2026-11-02" },
  "scope": "constituency",
  "values": {
    "rvkn": { "B": 5, "C": 10, "D": 25, "F": 5, "J": 2, "M": 14, "P": 3.5, "S": 30, "V": 3.5, "O": 2 },
    "rvks": { "...": "..." }
  }
}
```

- Constituency ids: `rvkn` Reykjavíkurkjördæmi norður, `rvks` Reykjavíkurkjördæmi suður,
  `sv` Suðvesturkjördæmi, `nv` Norðvesturkjördæmi, `na` Norðausturkjördæmi, `s` Suðurkjördæmi.
- Party letters: B Framsóknarflokkur, C Viðreisn, D Sjálfstæðisflokkur,
  F Flokkur fólksins, J Sósíalistar, M Miðflokkur, P Píratar,
  S Samfylkingin, V Vinstri græn, **O = onnt og ógild**.
- Values are percentages and must sum to 100 (± 1.5) per constituency.
- **National polls** use `"scope": "national"` with one flat row of party
  values (the same letters, same sum rule). The model splits them across
  the six constituencies itself (see below), so most polls, which are only
  published nationally, can be added as-is:

  ```json
  {
    "pollster": "Gallup", "series": "Þjóðarpúlsinn",
    "published": "2026-11-10",
    "fieldwork": { "start": "2026-10-28", "end": "2026-11-09" },
    "scope": "national",
    "values": { "B": 5, "C": 10, "D": 25, "F": 5, "J": 2, "M": 14, "P": 3.5, "S": 30, "V": 3.5, "O": 2 }
  }
  ```
- `fieldwork`, `series` and any `note` are optional metadata; `pollster`,
  `published`, `scope` and `values` are required.

## Widget contract (`public/forecast.json`)

```json
{
  "schema": 1,
  "modelVersion": 2,
  "lastUpdated": "2026-11-03",
  "constituencies": { "rvkn": { "B": 5, "...": "..." } },
  "uncertainty": { "sigmaNat": 2.0, "sigmaDist": 1.4 },
  "sources": [{ "pollster": "Gallup", "series": "Þjóðarpúlsinn", "published": "2026-11-03", "weight": 0.45 }]
}
```

`lastUpdated` is the publication date of the newest poll in the dataset,
not the recompute date. `weight` in each source is the pollster's
accuracy weight (see below).

## Model v2

Four ingredients, in order:

1. **Recency.** Exponential decay with a 45-day half-life, measured from
   the newest poll in the dataset.
2. **Pollster accuracy weight.** Set from how each house's final poll
   compared with the actual result in the 2017, 2021 and 2024 elections
   (Gallup was the most accurate final poll all three times):
   Gallup 0.45, FVS HÍ 0.30, Maskína 0.25. Houses with no track record
   weigh 0.125 until they have one.
3. **Same-house de-correlation.** Each poll is additionally damped by
   0.6 for every later poll from the same house published within 30 days
   of it: consecutive releases share sample and method, so they are not
   independent readings. The newest release keeps its full weight.
4. **House-effect correction.** Every house's final polls have shown
   systematic party deviations from the results (e.g. everyone
   under-reading Flokkur fólksins). The correction subtracted from a
   poll's party value is 50% of the house's mean (final poll − result)
   deviation across those elections — shrunk to hedge against
   over-correction on a 3-election sample. **Re-estimate after each
   election.**

National polls are house-corrected on the flat national row first, then
split across constituencies with the swing method against
`anchors/2024-results.json` (official Hagstofa Íslands result, KOS02018):
a party's share in constituency c = its anchor share in c × (poll
national share / anchor national share). Parties missing from the anchor
(e.g. new parties) are spread uniformly. **Replace the anchor after the
next election.**

Out-of-sample backtest (house effects re-estimated leaving each election
out): mean absolute error 1.05 points per party across 2017/2021/2024,
vs 1.38 for the unweighted v1 average. Still no trend/late-swing
extrapolation and no time-to-election uncertainty scaling — those are
the next steps. `polls/` is the source of truth, so model changes can
always be re-run over the same data.

## Update workflow (how data actually gets here)

New polls are discussed in a Vibe Work conversation first. The updated
poll file (and any model changes) come out of that conversation; commit
them here from the Vofan-RVK account — via the GitHub web UI is fine
(Add file → Create new file → paste). The action does the rest.
