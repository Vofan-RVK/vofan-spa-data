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
- `fieldwork`, `series` and any `note` are optional metadata; `pollster`,
  `published`, `scope` and `values` are required.

## Widget contract (`public/forecast.json`)

```json
{
  "schema": 1,
  "lastUpdated": "2026-11-03",
  "constituencies": { "rvkn": { "B": 5, "...": "..." } },
  "uncertainty": { "sigmaNat": 2.0, "sigmaDist": 1.4 },
  "sources": [{ "pollster": "Gallup", "series": "Þjóðarpúlsinn", "published": "2026-11-03" }]
}
```

`lastUpdated` is the publication date of the newest poll in the dataset,
not the recompute date.

## Model v1

Recency-weighted average per constituency, exponential decay with a
45-day half-life measured from the newest poll. No house effects, no
trend, no time-to-election uncertainty scaling yet. The model is meant to
be replaced by the fuller one built in discussion; `polls/` is the source
of truth, so model changes can always be re-run over the same data.

## Update workflow (how data actually gets here)

New polls are discussed in a Vibe Work conversation first. The updated
poll file (and any model changes) come out of that conversation; commit
them here from the Vofan-RVK account — via the GitHub web UI is fine
(Add file → Create new file → paste). The action does the rest.
