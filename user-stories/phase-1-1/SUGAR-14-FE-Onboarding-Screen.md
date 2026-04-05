# SUGAR-14-FE-Onboarding-Screen

## Metadata

| Field | Value |
|---|---|
| **Phase** | 1-1 — Foundation |
| **Category** | Frontend |
| **User Stories (PRD)** | US-47 (brief onboarding), US-48 (skip onboarding) |
| **Status** | Not started |
| **Blocked by** | SUGAR-10-FE-Zustand-Store, SUGAR-13-FE-Navigation-Setup |

---

## Context

The onboarding screen is the first thing a new user sees. It serves three purposes:
1. Communicates what the app does
2. Collects the user's preferred blood sugar unit (mg/dL or mmol/L)
3. Displays the medical disclaimer

The user can skip onboarding and go straight to guest mode with the default unit.

---

## User Story

> As a **new user**, I want to see a brief, clear introduction to the app with a choice of units, so I can get started quickly without being overwhelmed.

> As a **user who doesn't want to set up anything**, I want to skip the introduction entirely and go straight to logging my first reading.

---

## Acceptance Criteria

### AC-1: Single screen shown on first launch

- OnboardingScreen is shown **only** when `onboardingCompleted === false` in the Zustand store
- It is the first screen visible on a fresh app install

### AC-2: Content elements

The screen contains, in order:

1. **App tagline** — "Your personal blood sugar tracker" or similar (team to refine copy)
2. **Subtitle** — brief description of what the app does
3. **Unit preference selector** — a binary choice between `mg/dL` and `mmol/L` (segmented control or toggle)
4. **Medical disclaimer** — clearly formatted box with the following text (or substantially similar, reviewed by legal/product):

> *"This app is for personal wellness tracking only. It is not a medical device and is not intended to diagnose, treat, cure, or prevent any disease."*

5. **"Get Started" button** — primary action
6. **"Skip" link** — secondary action, below the button

### AC-3: "Get Started" behavior

- Saves selected unit to Zustand store (`setPreferredUnit`)
- Marks onboarding as complete (`completeOnboarding`)
- Navigates to the main app (Log tab)

### AC-4: "Skip" behavior

- Sets unit to default (`mg/dL`) regardless of what was selected
- Marks onboarding as complete
- Navigates to the main app (Log tab)

### AC-5: Never shown again

- After `onboardingCompleted === true`, the onboarding screen is **never shown again** — even if the user kills and relaunches the app
- This is verified by the Zustand persist middleware

### AC-6: Accessible

- Unit selector options have `accessibilityLabel`
- "Get Started" has `accessibilityLabel`
- "Skip" has `accessibilityLabel`
- All text has sufficient contrast

---

## Definition of Done

- [ ] Fresh install → onboarding shown
- [ ] "Get Started" → unit saved, onboarding marked complete, main app shown
- [ ] "Skip" → default unit saved, onboarding marked complete, main app shown
- [ ] Kill app and relaunch → onboarding NOT shown
- [ ] Unit preference persists across restarts
- [ ] Medical disclaimer visible
- [ ] Screen is accessible (labels, contrast)

---

## Notes

- The disclaimer text should be reviewed by product/legal before finalizing
- Copy can be refined by the team — the content above is the minimum required per the PRD
- The onboarding screen is intentionally **minimal** — resist adding more steps in Phase 1
