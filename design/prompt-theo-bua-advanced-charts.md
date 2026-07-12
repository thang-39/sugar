# Claude Design prompt — Trends "By meal" (Theo bữa) advanced analysis

Paste the prompt below into Claude Design **with the existing `Sugar App.dc.html` design loaded**, so it extends the current file instead of inventing a new style.

---

Extend the existing Sugar app design. Modify ONLY the Trends tab; keep every other screen untouched. Follow the existing visual language exactly: Nunito, white cards `border-radius:20px` with `box-shadow:0 4px 16px rgba(27,43,36,.06)`, theme via `{{ primary }}` / `var(--brand)` / `var(--surface)` CSS variables (green Evergreen for General mode, rose for Gestational mode — both modes get this feature).

**1. Segmented control at the top of Trends**
Under the "Trends" title, add a 2-segment pill control: `Trend line | By meal`. Style it like a pill toggle (full-width, `var(--surface)` track, white active segment with subtle shadow, font-weight 800). "Trend line" shows the current chart view unchanged (scale chips + line chart + 3 stat cards). "By meal" shows the new view below.

**2. "By meal" view (Pro feature)**
Keep the existing scale chips (7d / 14d / 30d / 90d) — they filter this view too. Below them, a vertical stack of 4 slot cards in this order: **Fasting, After breakfast, After lunch, After dinner**. Each card:

- Header row: meal icon in a small rounded `var(--surface)` tile + slot name (font-weight 800) + a delta badge on the right: pill showing `▼ 0.4` in green when improved vs the previous equal period, `▲ 0.6` in soft orange (#E8622C tint) when worse, `—` gray when no prior data.
- Body row, 3 inline stats: **Average** (big number, e.g. `6.2` with small `mmol/L` unit), **In range** (e.g. `86%`), **Readings** (e.g. `12`). Average number is colored `{{ primary }}` when the % in range ≥ 80, `#E8622C` otherwise.
- A thin horizontal in-range bar under the stats: track `#F1F6F3`, fill `{{ primary }}` at the % width.
- Empty slot state: card stays but muted — "No readings in this period" in `#8A9A91`, no stats.

Demo data (mmol/L): Fasting 5.1 avg / 92% / 14 readings / ▼0.2 · After breakfast 6.9 / 64% / 12 / ▲0.4 · After lunch 6.3 / 83% / 13 / ▼0.1 · After dinner 6.6 / 75% / 11 / —.

**3. Free-user locked state**
Add a boolean state so the same "By meal" view can render locked: the slot cards render blurred/40%-opacity behind a centered overlay card — lock icon in a `{{ primary }}` rounded tile, title "Per-meal analysis is a Pro feature", one line "See averages and in-range % for each meal of the day", and a `{{ primary }}` full-width pill button "Unlock Sugar Pro" that opens the existing Sugar Pro screen. No data readable through the blur.

**4. Sugar Pro screen — two small edits**
- Add benefit row "Per-meal analysis" (check_circle icon, same row style) to the benefits card.
- Remove the strikethrough anchor price `199,000₫` next to `149,000₫` — show the single price only, with a small "Launch price" caption under it. (Store-policy/advertising-law requirement.)

Everything must work at large font sizes — elderly users; min body font 12.5px in this mockup scale, primary numbers big and bold.

---

## After export

Export over `design/Sugar App.dc.html`, then have Claude diff it and reconcile `src/ui/theme` + primitives per CLAUDE.md ("never guess token values").
