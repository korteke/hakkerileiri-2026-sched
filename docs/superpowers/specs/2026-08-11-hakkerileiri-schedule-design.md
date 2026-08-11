# Hakkerileiri 2026 Schedule Site — Design

Status: Approved
Date: 2026-08-11

## Overview

A static, single-page website that presents the Hakkerileiri 2026 hacker camp
schedule (Sahanlahti, 10.–14.8.2026) in a form that's easier to use than the
source spreadsheet, especially for people checking "what's on now" during the
event, which is already in progress.

## Goals

- Faithfully reproduce the schedule from `Camp program (DRAFT).xlsx` — same
  events, same day/track structure, same category color-coding (the sheet's
  cell fill colors already encode a category legend).
- Make the current/next event obvious to a visitor checking on their phone.
- Let categories be filtered on/off.
- Zero build step: edit `data/schedule.yaml`, refresh the page, done.
- Deploy as a plain static site on GitHub Pages (serve from `main` / root).
- Dracula color theme.

## Source data & extraction notes

The spreadsheet has one sheet, a grid of Time × (Day × Track). Columns:

| Col | Meaning |
|---|---|
| A / J | Time label (duplicated left/right in the sheet for readability; site only needs it once) |
| B | Monday — single track (arrival day) |
| C / D | Tuesday — Workshop track / Talks, Disobey Stage |
| E / F | Wednesday — Workshop track / Talks, Disobey Stage |
| G / H | Thursday — Workshop track / Talks, Disobey Stage |
| I | Friday — single track (checkout day, ends ~12:00) |

Cell fill colors form the category legend defined in the sheet itself (rows 18–21):

| Fill (hex) | Category |
|---|---|
| `FFD9EAD3` | Sahanlahti events (venue-provided, e.g. Lunch, Check-out) |
| `FFA4C2F4` | Camp events (ceremonies, sauna) |
| `FFD9D2E9` | Workshops |
| `FFFFF2CC` | Talks |
| `FFD9D9D9` / `FF666666` | Not part of the sheet's own legend — used for headers, "Networking", "zzz", "Loading camp....", "BYE". Treated as a 5th **Info/social** category on the site (see Data model below). |

### Assumptions made when transcribing (confirmed with organizer where noted)

- The "zzz" row (no time label in the source) represents overnight sleep-in
  time before lunch — confirmed by organizer. Kept as its own row, category
  Info, label "Sleep".
- The Lunch row's time-label cell contains a raw date serial (`46367`), a
  spreadsheet artifact, not a real value — confirmed by organizer. The site
  shows no time badge for this row, just "Lunch".
- Two cells have no fill at all (default/white): Monday 17–18 "Dist - Hacker
  Mindset, Disobey Stage" and Wednesday 20–22 "rundiable & whereisgiz -
  Conspiracy Theories". Both are talk-like content, so they're categorized as
  **Talks** in the YAML with an inline comment flagging the assumption, since
  the source didn't specify. Easy to recolor later by editing one line.
- Two events span two consecutive one-hour rows with identical text in the
  source (Tue 16–18 "Cat Ear Workshop", Thu 15–17 "Pizza Workshop"). Rather
  than adding row-span logic, they're kept as two separate row entries with
  identical content — visually they render as two same-colored stacked cards,
  which reads as one continuous block without added rendering complexity.
- Thursday 17–18 "Closing ceremony" fills both the Workshop and Talk columns
  with the same color and no separate text in the second column — modeled as
  one full-width cell for that row/day rather than two per-track cells (see
  schema below).
- Cells with no text and a blocked-looking fill (`FF666666`) and no text at
  all render as empty space, not a card (e.g. Monday's Tue/Wed/Thu-only slots
  before arrival, Friday afternoon after checkout).

## Data model

`data/schedule.yaml` is the single source of truth, hand-editable:

```yaml
event:
  name: Hakkerileiri 2026
  venue: Sahanlahti
  dates: "10.–14.8.2026"

categories:
  sahanlahti: {label: "Sahanlahti events", color: "#50fa7b"}
  camp:       {label: "Camp events",       color: "#8be9fd"}
  workshop:   {label: "Workshops",         color: "#bd93f9"}
  talk:       {label: "Talks",             color: "#f1fa8c"}
  info:       {label: "Info / social",     color: "#6272a4"}

days:
  - id: mon
    label: "Monday 10.8"
    date: "2026-08-10"
    tracks: [main]
  - id: tue
    label: "Tuesday 11.8"
    date: "2026-08-11"
    tracks: [workshop, talk]
  - id: wed
    label: "Wednesday 12.8"
    date: "2026-08-12"
    tracks: [workshop, talk]
  - id: thu
    label: "Thursday 13.8"
    date: "2026-08-13"
    tracks: [workshop, talk]
  - id: fri
    label: "Friday 14.8"
    date: "2026-08-14"
    tracks: [main]

rows:
  - time: null            # no explicit start/end in source
    label: "Sleep"
    cells:
      mon: {main: {category: info, title: "zzz"}}
      tue: {workshop: {category: info, title: "zzz"}, talk: {category: info, title: "zzz"}}
      # ... same shape for wed, thu
      fri: {main: {category: info, title: "zzz"}}

  - time: null
    label: "Lunch"
    cells:
      mon: {main: {category: sahanlahti, title: "Lunch"}}
      # ... every day/track gets a Lunch cell

  - time: "12-13"
    cells:
      mon: {main: {category: info, title: "Loading camp...."}}
      tue: {talk: {category: talk, title: "tk0 - Badge Hacking Introduction"}}
      wed: {talk: {category: talk, title: "Dist - Introduction to the world of NFC"}}
      thu: {talk: {category: talk, title: "Karo -  Application Security"}}
      fri: {main: {category: sahanlahti, title: "Check-out at 12:00"}}

  # ... remaining rows: 13-14, 14-15, 15-16, 16-17, 17-18, 18-20, 20-22
```

Rules:

- A cell is either **per-track** (nested under `workshop`/`talk`/`main` keys)
  or **full-width for the day** (a single object with `category`/`title`
  directly under the day id) — used for the one spanning event noted above.
- A missing key or explicit `null` renders as empty space (no card).
- An event object may carry an optional `note:` string, rendered as small
  subtext under the title (used for the Cat Ear Workshop's "orders have been
  done" footnote from the sheet).
- Row order in the YAML is display order; no separate sort key.

## Visual design — Dracula, mapped to the original legend

Dracula's palette maps cleanly onto the categories above, keeping the same
semantics the organizer already used: yellow for talks, purple for
workshops, green for Sahanlahti events, cyan for camp events (was blue),
comment-gray for the informal/social catch-all. Background `#282a36`, panel
`#44475a`, text `#f8f8f2`.

## Layout & interaction

- Header: event name, venue, dates.
- Day tabs (Mon–Fri). Defaults to whichever tab matches the visitor's local
  date if it falls within 10–14 Aug 2026, else the first day.
- Two-track days show Workshop/Talk as side-by-side columns on desktop,
  stacked on mobile. Single-track days (Mon/Fri) show one column.
- The event card matching the visitor's current local time is highlighted
  (outline/glow) and scrolled into view on load; recomputed every 60s.
- Category filter chips toggle card visibility; a legend shows the color key.

## Files & deployment

```
index.html
styles.css
script.js
vendor/js-yaml.min.js     # self-hosted, no CDN
data/schedule.yaml
tools/xlsx_to_yaml.py     # one-off conversion helper, not part of the deployed site
README.md                 # how to edit the schedule
```

No build step for the deployed site. GitHub Pages configured to deploy from
the `main` branch, root folder.

## Verification

No test framework — this is static content. Verification is manual:

- Cross-check every row in `schedule.yaml` against the CSV dump of the
  original sheet for 1:1 accuracy.
- Serve locally (`python3 -m http.server`) and check: all 5 days render,
  colors match the legend, filters toggle correctly, current-event highlight
  is correct (verifiable live right now, since the camp is in progress),
  mobile layout holds up at narrow widths.
