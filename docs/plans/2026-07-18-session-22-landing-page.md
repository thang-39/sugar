# Session 22 — Landing page + backlog triage

**Status:** IN PROGRESS (handoff to next session)
**Date started:** 2026-07-18
**PLAN reference:** `PLAN-2.md` → "Session 22 (optional): Landing page + backlog triage (growth plan S21)"
**Commit target:** `chore: landing page`

---

## Context / decisions already made

- **Landing concept** = an award-winning cinematic "scroll = the 40-week pregnancy journey" page. The hero is a single glowing **glucose line** that must stay inside a luminous **target band**; scrolling forward advances the journey. Fixed HUD (week 0→40, live glucose value, trimester label, IN RANGE pill). Background color-grades plum-black → warm rose → blush dawn. Global English copy (not Vietnamese). Rose theme (`#D14C87` / `#A62C63` / `#F6D9E6`) to match the GDM app theme.
- **Design source** lives in `design/` (Claude Design export): `design/LP-SugarJourney.html` (the `.dc.html`-style export with `<x-dc>` + `DCLogic` runtime) and `design/privacy.html`. These are DESIGN sources, not deployable — keep them.
- **Hosting decision:** GitHub Pages served from **`/docs` on `main`** (already the setup — the old `docs/privacy.html` is live at `https://thang-39.github.io/sugar/privacy.html`). No separate branch/repo.
  - Landing URL when pushed: **`https://thang-39.github.io/sugar/`**
  - Privacy URL: **`https://thang-39.github.io/sugar/privacy.html`**
- **Privacy language decision:** English default + toggle to Vietnamese.
- **Contact email:** kept the currently-live `thang.tran1@mesoneer.io` (the Claude Design privacy export had `trantruongminhthang@gmail.com` behind Cloudflare obfuscation — NOT adopted, to avoid silently changing a published contact). Revisit if a switch is wanted.

---

## DONE

1. **`docs/index.html`** — deployable landing, ported from `design/LP-SugarJourney.html`:
   - Stripped all Claude Design runtime (`<x-dc>`, `<helmet>`, `support.js`, `class Component extends DCLogic`, `renderVals`). Rewrote as a plain `class SugarLP` instantiated on `DOMContentLoaded` with hardcoded defaults (`glowIntensity:1, particles:true, journeyVh:900, calmMode:false`).
   - All canvas/HUD/scroll logic preserved 1:1 (glucose curve `g()`, color grade `grade()`, `frame()` scrub loop, beats, chip, meal pings, report card).
   - Added `<head>` SEO: `<title>`, description, canonical, Open Graph + Twitter card, `theme-color`, inline-SVG favicon.
   - Respects `prefers-reduced-motion` (inherited from source logic).
   - Verified: `node --check` on the script → JS OK; no leftover DC refs.
2. **`docs/privacy.html`** — replaced old VI-only stacked page:
   - English default + "Tiếng Việt" toggle button (localStorage-persisted).
   - Removed Cloudflare `email-protection` obfuscation + `email-decode.min.js` script (would 404 outside Cloudflare); plain `mailto:thang.tran1@mesoneer.io`.
   - Added `← Sugar` back-link to `./index.html`.
3. **`app/about.tsx`** — added a "Website" link:
   - New `WEBSITE_URL = 'https://thang-39.github.io/sugar/'` const.
   - Refactored `openPrivacy` → generic `openUrl(url)`.
   - Added a ghost `Button` (globe-outline icon) above the privacy button, `accessibilityRole="link"`.
4. **i18n** — added `screens.settings.about.website` key: `"Website"` (en) / `"Trang web"` (vi).
5. **Verify:** `npx tsc --noEmit` passes.

**Files touched:** `docs/index.html` (new), `docs/privacy.html` (rewritten), `app/about.tsx`, `src/i18n/en.json`, `src/i18n/vi.json`. Design sources added: `design/LP-SugarJourney.html`, `design/privacy.html`.

---

## TODO (next session)

### A. Landing polish / assets
- [ ] **Store badge links** in `docs/index.html` are placeholders: two `<a href="#">` marked `TODO(session-23)`. Replace with the real App Store + Google Play listing URLs once they exist (Session 23). Until then, keep as `#` (or point at the store search page).
- [x] **`og:image`** — DONE (2026-07-18). Created `docs/og.png` (1200×630, dark rose gradient + glowing glucose line inside target band + "40 weeks. / One steady line." wordmark + IN RANGE pill). Built from an SVG rendered via `qlmanage` → cropped to 1200×630 with `sips` (source SVG in scratchpad; no PIL/cairosvg/rsvg available). Updated `docs/index.html`: `og:image` + new `twitter:image` now use the ABSOLUTE URL `https://thang-39.github.io/sugar/og.png`, added `og:url` + `og:image:width/height`, and fixed the wrong `canonical`/`og:url` (was `https://sugar.app/` → now `https://thang-39.github.io/sugar/`).
- [ ] **2 real app screenshots** — PLAN-2 wants "2 screenshots" on the landing. Current landing renders a live glucose canvas + an inline SVG "report card" mock instead of real screenshots. Decide whether that satisfies the requirement or add real device screenshots (Today rose theme + report).
- [ ] **Manual visual QA** — open `docs/index.html` in a real browser (sandbox blocks a local server here). Verify: line is one seamless ribbon across all 7 beats, band never breaks, week meter + glucose readout sync to scroll, color grade continuous top→bottom, mobile bottom-HUD appears < 720px, reduced-motion fallback is static but readable.

### B. Deploy
- [ ] Confirm GitHub Pages is enabled on `main /docs` (likely already, since privacy is live). After merge/push, check `https://thang-39.github.io/sugar/` renders and both store/privacy links work.
- [ ] Add the landing URL to the **store listing** (that happens in the Session 22/23 store-assets work, not in-app).

### C. Backlog triage → PRD (still owed by Session 22)
DONE (2026-07-18) — recorded under a new "Growth-plan S21 backlog triage" subsection in `PRD.md` → Deferred:
- [x] Widget quick-log → **deferred** (native widget target, outside Expo managed workflow).
- [x] Onboarding steps → **done** in Session 10 (noted as done, no action).
- [x] Apple Health / Google Fit, food database, community → **still deferred**.
- [x] Meal-content logging + meal-photo AI analysis → **deferred** (idea logged 2026-07-11; revisit only with traction; pairs with food-database deferral).

### D. Leftover polish (Session 22 acceptance)
- [ ] GDM empty-state copy review.
- [ ] Screenshot share template.
- [ ] **1.3× font-scale audit** on the newer screens: paywall, account, vật tư (supplies), reminders, today.

---

## Acceptance criteria (from PLAN-2)
- Landing live at a public URL, fast on mobile, all links work.
- Deferred backlog recorded in PRD.
- Commit: `chore: landing page`.

## NOT in this session
- Store submission = **Session 23** (final launch). Do not submit here.
- RevenueCat / real purchase wiring = Session 23.

---

## Handoff notes for the next Claude session
- The deployable files are `docs/index.html` + `docs/privacy.html`. The `design/*.html` files are the Claude Design sources — if the look needs changing, edit in Claude Design, re-export over `design/LP-SugarJourney.html`, then re-port into `docs/index.html` (strip the `<x-dc>`/`DCLogic` wrapper again, same as done here).
- Nothing has been committed yet — working tree has the changes above uncommitted.
- The in-app link points at `https://thang-39.github.io/sugar/`; if the Pages base path ever changes, update `WEBSITE_URL` + `PRIVACY_URL` in `app/about.tsx`.
