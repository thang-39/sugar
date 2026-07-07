# Session 10 — Build + Store Prep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the finished v1.1 app into something installable and submittable — production `app.json`/`eas.json` config, a published privacy policy wired into the About screen, and drafted store-listing + compliance content.

**Architecture:** This session is config + docs, not feature code. There is almost no unit-testable logic; the one behavioral guard is that the About screen no longer points at a placeholder privacy URL (extracted into `src/config/urls.ts` and tested). Everything else is verified with `npx expo config`, JSON validation, `tsc`, and lint. Tasks that require external accounts (Expo/EAS, Apple Developer, Google Play Console) are marked **[HUMAN-GATED]** and collected into a runbook — they cannot be run from this environment.

**Tech Stack:** Expo SDK 54, EAS Build, Expo Router, GitHub Pages (static privacy policy).

---

## Project identity (fill in ONCE, referenced everywhere below)

This is a personal app with no company domain. We anchor the bundle identifier and privacy-policy URL to a GitHub identity you actually control (`github.io`), which is legitimate reverse-DNS.

Before starting, pick your values and substitute them literally in every task below:

- `GH_HANDLE` = your GitHub username. **Must be hyphen-free for the bundle ID** — iOS bundle identifiers and Android package segments allow only letters/digits and must start with a letter (no `-`). If your handle has a hyphen (e.g. `thang-tran`), drop it for the ID segment (`thangtran`) but keep the real handle for the Pages URL.
- **Bundle ID / Android package** = `io.github.<GH_HANDLE_NOHYPHEN>.sugar`  (example: `io.github.thangtran.sugar`)
- **Repo name** = `sugar` (this repo)
- **Privacy policy URL** = `https://<GH_HANDLE>.github.io/sugar/privacy.html`  (GitHub Pages served from `/docs` on `main`)
- **App display name** = `Sugar` (unchanged; the display name is easy to change later, the bundle ID is not).

Throughout this plan, wherever you see `io.github.GH_HANDLE.sugar` or `<GH_HANDLE>.github.io`, replace with your real values.

---

## File Structure

- `app.json` — add production iOS/Android identifiers, version codes, permission allow-list, encryption declaration. (modify)
- `eas.json` — new; EAS Build profiles (development / preview / production) + submit stub. (create)
- `src/config/urls.ts` — new; single source of the real privacy-policy URL, testable without rendering a screen. (create)
- `src/config/__tests__/urls.test.ts` — new; guard that the privacy URL is a real https URL, not the placeholder. (create)
- `app/(tabs)/settings/about.tsx` — import the URL from `src/config/urls.ts` instead of the inline placeholder. (modify)
- `docs/privacy.html` — new; bilingual (vi + en) static privacy policy published via GitHub Pages. (create)
- `docs/store/listing-vi.md`, `docs/store/listing-en.md` — new; store description drafts (no diagnose/treat/manage claims). (create)
- `docs/store/compliance.md` — new; Google Play Data Safety + Health Apps declaration + Apple App Privacy answers. (create)
- `docs/store/screenshots.md` — new; screenshot capture checklist (vi). (create)
- `docs/store/submission-runbook.md` — new; the [HUMAN-GATED] account/build/submit steps. (create)

---

## Task 1: Extract the privacy URL into config + guard test

**Files:**
- Create: `src/config/urls.ts`
- Create: `src/config/__tests__/urls.test.ts`
- Modify: `app/(tabs)/settings/about.tsx:9-10` (remove the inline placeholder), `about.tsx:6-7` (imports)

- [ ] **Step 1: Write the failing test**

`src/config/__tests__/urls.test.ts`:

```ts
import { PRIVACY_POLICY_URL } from '../urls';

describe('PRIVACY_POLICY_URL', () => {
  it('is a real https URL', () => {
    expect(PRIVACY_POLICY_URL).toMatch(/^https:\/\//);
  });

  it('is not the pre-launch placeholder', () => {
    expect(PRIVACY_POLICY_URL).not.toContain('example.com');
  });

  it('points at the published GitHub Pages policy page', () => {
    expect(PRIVACY_POLICY_URL).toMatch(/github\.io\/sugar\/privacy\.html$/);
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx jest src/config/__tests__/urls.test.ts`
Expected: FAIL — `Cannot find module '../urls'`.

- [ ] **Step 3: Create the config module with the real URL**

`src/config/urls.ts` (replace `<GH_HANDLE>` with your GitHub username):

```ts
/**
 * External URLs used by the app.
 * PRIVACY_POLICY_URL is published as a static page via GitHub Pages (see docs/privacy.html)
 * and is linked from the About screen (PRD story 55) and both store listings.
 */
export const PRIVACY_POLICY_URL = 'https://<GH_HANDLE>.github.io/sugar/privacy.html' as const;
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx jest src/config/__tests__/urls.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire the About screen to the config value**

In `app/(tabs)/settings/about.tsx`, delete lines 9–10:

```ts
// Placeholder — replaced with the real policy URL in Session 10.
const PRIVACY_URL = 'https://example.com/privacy';
```

Add the import alongside the existing `@/ui/...` imports (line 6 area):

```ts
import { PRIVACY_POLICY_URL } from '@/config/urls';
```

Update the single usage inside `openPrivacy` (currently `await Linking.openURL(PRIVACY_URL);`):

```ts
await Linking.openURL(PRIVACY_POLICY_URL);
```

- [ ] **Step 6: Verify types + lint + full test suite**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: tsc clean, lint clean, all tests green (previous count + 3).

- [ ] **Step 7: Commit**

```bash
git add src/config/urls.ts src/config/__tests__/urls.test.ts "app/(tabs)/settings/about.tsx"
git commit -m "feat: wire real privacy policy url into about screen"
```

---

## Task 2: Publish the privacy policy static page (GitHub Pages)

**Files:**
- Create: `docs/privacy.html`

The page content is dictated by PRD "Store & Health-App Compliance": all data on-device, nothing collected, nothing transmitted, no analytics, no ads, no third-party SDKs that phone home. Bilingual vi + en.

- [ ] **Step 1: Create the static page**

`docs/privacy.html` (self-contained, no external assets so it renders offline too):

```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sugar — Privacy Policy / Chính sách bảo mật</title>
    <style>
      body { font-family: -apple-system, system-ui, sans-serif; max-width: 720px; margin: 0 auto; padding: 24px; line-height: 1.6; color: #1b2b24; }
      h1 { color: #0fa36b; } h2 { margin-top: 2rem; }
      hr { border: none; border-top: 1px solid #e9f5ef; margin: 2.5rem 0; }
      .updated { color: #667; font-size: 0.9rem; }
    </style>
  </head>
  <body>
    <h1>Sugar — Chính sách bảo mật</h1>
    <p class="updated">Cập nhật: 2026-07-06</p>
    <p>Sugar là ứng dụng theo dõi đường huyết cá nhân. Chúng tôi thiết kế ứng dụng theo nguyên tắc: dữ liệu của bạn là của bạn.</p>
    <h2>Dữ liệu được lưu ở đâu</h2>
    <p>Toàn bộ số liệu đo (giá trị đường huyết, thời điểm, ghi chú) và cài đặt được lưu <strong>duy nhất trên thiết bị của bạn</strong> trong cơ sở dữ liệu nội bộ của ứng dụng.</p>
    <h2>Chúng tôi thu thập gì</h2>
    <p><strong>Không gì cả.</strong> Ứng dụng không thu thập, không truyền, không tải lên bất kỳ dữ liệu cá nhân hay dữ liệu sức khoẻ nào. Không có tài khoản, không đăng nhập, không đồng bộ đám mây.</p>
    <h2>Bên thứ ba</h2>
    <p>Ứng dụng không có công cụ phân tích (analytics), không quảng cáo, và không nhúng SDK bên thứ ba nào gửi dữ liệu ra ngoài.</p>
    <h2>Chia sẻ dữ liệu</h2>
    <p>Tính năng xuất CSV tạo tệp trên thiết bị và chỉ chia sẻ khi bạn chủ động chọn qua hộp thoại chia sẻ của hệ điều hành. Bạn kiểm soát hoàn toàn tệp đó.</p>
    <h2>Xoá dữ liệu</h2>
    <p>Bạn có thể xoá toàn bộ dữ liệu bất kỳ lúc nào trong phần Cài đặt → Xoá toàn bộ dữ liệu. Gỡ ứng dụng cũng xoá mọi dữ liệu.</p>
    <h2>Miễn trừ y tế</h2>
    <p>Ứng dụng chỉ hỗ trợ theo dõi sức khoẻ cá nhân, không phải thiết bị y tế.</p>
    <h2>Liên hệ</h2>
    <p>Mọi câu hỏi: <a href="mailto:thang.tran1@mesoneer.io">thang.tran1@mesoneer.io</a></p>

    <hr />

    <h1 lang="en">Sugar — Privacy Policy</h1>
    <p class="updated" lang="en">Last updated: 2026-07-06</p>
    <div lang="en">
      <p>Sugar is a personal blood-sugar tracking app. It is built on one principle: your data is yours.</p>
      <h2>Where your data lives</h2>
      <p>All your readings (values, timestamps, notes) and settings are stored <strong>only on your device</strong>, in the app's local database.</p>
      <h2>What we collect</h2>
      <p><strong>Nothing.</strong> The app collects no personal or health data, transmits nothing, and uploads nothing. There are no accounts, no sign-in, no cloud sync.</p>
      <h2>Third parties</h2>
      <p>No analytics, no ads, and no third-party SDKs that send data off the device.</p>
      <h2>Sharing</h2>
      <p>The CSV export feature creates a file on your device and only shares it when you explicitly choose to via the operating system's share sheet. You are in full control of that file.</p>
      <h2>Deleting your data</h2>
      <p>You can erase all data at any time in Settings → Delete all data. Uninstalling the app also removes everything.</p>
      <h2>Medical disclaimer</h2>
      <p>This app is for personal wellness tracking only. It is not a medical device.</p>
      <h2>Contact</h2>
      <p>Questions: <a href="mailto:thang.tran1@mesoneer.io">thang.tran1@mesoneer.io</a></p>
    </div>
  </body>
</html>
```

- [ ] **Step 2: Verify the page is well-formed and matches the wired URL**

Run: `node -e "const s=require('fs').readFileSync('docs/privacy.html','utf8'); if(!/Data Not Collected|collects no personal/i.test(s) && !/Không gì cả/.test(s)) throw new Error('missing no-collection statement'); console.log('privacy.html OK')"`
Expected: prints `privacy.html OK`. Also open the file in a browser and confirm both language sections render.

- [ ] **Step 3: Commit**

```bash
git add docs/privacy.html
git commit -m "docs: bilingual privacy policy static page"
```

- [ ] **Step 4: [HUMAN-GATED] Enable GitHub Pages**

In the repo on GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / folder: `/docs`**. Save, wait ~1 min, then open `https://<GH_HANDLE>.github.io/sugar/privacy.html` and confirm it loads. This must match `PRIVACY_POLICY_URL` from Task 1 exactly (the `urls.test.ts` regex already enforces the shape; this step confirms the page is actually live).

---

## Task 3: Production app.json (identifiers, version codes, permission audit, encryption)

**Files:**
- Modify: `app.json`

Current `app.json` has `ios: { supportsTablet: true }` and `android: { adaptiveIcon, predictiveBackGestureEnabled }` but **no `bundleIdentifier`, no `android.package`, no build numbers, no permission audit** — all required before a store build.

- [ ] **Step 1: Add iOS production keys**

Replace the `"ios"` block with (substitute your ID):

```json
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "io.github.GH_HANDLE.sugar",
      "buildNumber": "1",
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
    },
```

Rationale: `ITSAppUsesNonExemptEncryption: false` declares the app uses no non-exempt encryption, so App Store Connect stops asking the export-compliance question on every build. No `NS*UsageDescription` strings are needed — the app uses no camera, location, contacts, or HealthKit.

- [ ] **Step 2: Add Android production keys + permission allow-list**

Replace the `"android"` block with (substitute your ID; keep the existing `adaptiveIcon` values):

```json
    "android": {
      "package": "io.github.GH_HANDLE.sugar",
      "versionCode": 1,
      "adaptiveIcon": {
        "backgroundColor": "#0FA36B",
        "foregroundImage": "./assets/images/android-icon-foreground.png"
      },
      "predictiveBackGestureEnabled": false,
      "permissions": []
    },
```

Rationale: `"permissions": []` is an explicit allow-list — Expo will not add any Android runtime permissions beyond the required defaults (INTERNET). This is the "should need none beyond storage/share" audit: `expo-sharing` uses the system share sheet and `expo-file-system` writes to app-scoped storage, neither of which needs a dangerous permission on modern Android.

- [ ] **Step 3: Verify the config resolves**

Run: `npx expo config --type public`
Expected: prints the fully-resolved config JSON with your `ios.bundleIdentifier` and `android.package` present, and exits 0 (no schema errors).

- [ ] **Step 4: Confirm the Android permission audit**

Run: `npx expo config --type public | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const c=JSON.parse(s); const p=c.android&&c.android.permissions; console.log('android.permissions =', JSON.stringify(p)); if(p===undefined) throw new Error('permissions allow-list not applied'); })"`
Expected: `android.permissions = []`. (If a later dependency needs a permission, this is where it would surface — decide explicitly, don't leave it implicit.)

- [ ] **Step 5: Commit**

```bash
git add app.json
git commit -m "chore: production app identifiers, version codes, permission audit"
```

---

## Task 4: EAS Build configuration

**Files:**
- Create: `eas.json`

- [ ] **Step 1: Create eas.json**

`eas.json`:

```json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "local"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": false
    }
  },
  "submit": {
    "production": {}
  }
}
```

Rationale: `appVersionSource: "local"` keeps the version/buildNumber/versionCode we set in `app.json` as the source of truth (no surprise remote increments). `preview` builds an installable APK for sideloading onto a real device without store submission — this is what satisfies the "installable build on a real device" acceptance criterion once accounts exist. `production` builds the store artifacts (AAB / IPA).

- [ ] **Step 2: Verify eas.json is valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('eas.json','utf8')); console.log('eas.json valid')"`
Expected: prints `eas.json valid`.

- [ ] **Step 3: Commit**

```bash
git add eas.json
git commit -m "chore: eas build profiles (development, preview, production)"
```

> **Note:** `npx eas-cli build:configure` / `eas build` require an Expo login and are covered in the runbook (Task 8). Running `eas init` there will add `extra.eas.projectId` to `app.json` — that edit is expected and should be committed when it happens.

---

## Task 5: Store listing drafts (vi + en)

**Files:**
- Create: `docs/store/listing-vi.md`
- Create: `docs/store/listing-en.md`

Hard rule from PRD: **no diagnose / treat / manage claims.** Phrase everything as "log and track" ("ghi lại và theo dõi"). Keep it in the personal-wellness category.

- [ ] **Step 1: Write the Vietnamese listing**

`docs/store/listing-vi.md`:

```markdown
# Sugar — Bản mô tả cửa hàng (Tiếng Việt)

## Tên hiển thị
Sugar — Nhật ký đường huyết

## Mô tả ngắn (≤ 80 ký tự)
Ghi lại và theo dõi chỉ số đường huyết, xem xu hướng, xuất CSV cho bác sĩ.

## Mô tả đầy đủ
Sugar giúp bạn ghi lại và theo dõi chỉ số đường huyết một cách đơn giản, phù hợp cho cả người lớn tuổi đo tại nhà.

- Ghi số đo chỉ trong vài chạm, với giá trị mặc định thông minh.
- Hỗ trợ mg/dL và mmol/L.
- Xem lịch sử và biểu đồ xu hướng theo 7 / 30 / 90 ngày.
- Đặt khoảng mục tiêu (lúc đói / sau ăn) và nhận cảnh báo trong ứng dụng khi ngoài khoảng.
- Xuất báo cáo CSV để gửi cho bác sĩ.
- Giao diện chữ lớn, đơn giản, tiếng Việt.

Dữ liệu của bạn được lưu hoàn toàn trên thiết bị. Ứng dụng không thu thập, không truyền dữ liệu.

Ứng dụng chỉ hỗ trợ theo dõi sức khoẻ cá nhân, không phải thiết bị y tế.

## Từ khoá
đường huyết, tiểu đường, nhật ký sức khoẻ, theo dõi đường huyết, mmol, mg/dL

## Danh mục
Sức khoẻ & Thể hình (Health & Fitness) — theo dõi sức khoẻ cá nhân

## Liên kết
- Chính sách bảo mật: https://<GH_HANDLE>.github.io/sugar/privacy.html
```

- [ ] **Step 2: Write the English listing**

`docs/store/listing-en.md`:

```markdown
# Sugar — Store Listing (English)

## Display name
Sugar — Blood Sugar Log

## Short description (≤ 80 chars)
Log and track your blood sugar readings, see trends, export CSV for your doctor.

## Full description
Sugar helps you log and track your blood sugar readings simply — friendly for elderly users measuring at home.

- Log a reading in a few taps with smart defaults.
- Supports both mg/dL and mmol/L.
- View history and trend charts over 7 / 30 / 90 days.
- Set target ranges (fasting / after-meal) and get an in-app alert when a reading is out of range.
- Export a CSV report to share with your doctor.
- Large-text, simple interface; Vietnamese and English.

Your data stays entirely on your device. The app collects nothing and transmits nothing.

This app is for personal wellness tracking only. It is not a medical device.

## Keywords
blood sugar, glucose log, diabetes log, health tracker, mmol, mg/dL

## Category
Health & Fitness — personal wellness tracking

## Links
- Privacy policy: https://<GH_HANDLE>.github.io/sugar/privacy.html
```

- [ ] **Step 3: Compliance check the copy**

Run: `node -e "const fs=require('fs'); const bad=/\b(diagnos|treat|manage(s|ment)? (your )?diabetes|cure|medical device(?! ))/i; for(const f of ['docs/store/listing-vi.md','docs/store/listing-en.md']){const t=fs.readFileSync(f,'utf8').replace(/not a medical device|không phải thiết bị y tế/gi,''); if(bad.test(t)) throw new Error('claim risk in '+f); } console.log('listing copy OK')"`
Expected: prints `listing copy OK` (the disclaimer's own "medical device" mention is excluded).

- [ ] **Step 4: Commit**

```bash
git add docs/store/listing-vi.md docs/store/listing-en.md
git commit -m "docs: store listing drafts (vi + en)"
```

---

## Task 6: Compliance answers + screenshot checklist

**Files:**
- Create: `docs/store/compliance.md`
- Create: `docs/store/screenshots.md`

- [ ] **Step 1: Write the compliance answer sheet**

`docs/store/compliance.md`:

```markdown
# Store Compliance Answers (PRD "Store & Health-App Compliance")

## Google Play — Data Safety form
- Does your app collect or share any user data? **No.**
- Data collected: **None.**
- Data shared: **None.**
- Is all data encrypted in transit? **N/A — no data leaves the device.**
- Can users request data deletion? **Data is on-device only; Settings → Delete all data wipes it, and uninstalling removes everything.**

## Google Play — Health Apps declaration
- Does the app access, collect, or transmit health data? **The app records blood-sugar readings the user enters, stored only on-device. No health data is transmitted or shared.**
- Category: **Personal wellness / fitness tracking — NOT a medical app.**
- Does it provide medical advice, diagnosis, or treatment? **No.**
- Target API level: set to the current Play requirement at submission time (EAS default targets a compliant level).

## Apple — App Privacy ("Data Not Collected")
- Data collection: **Data Not Collected.** (App Store Connect → App Privacy → "We do not collect data from this app".)
- HealthKit: **not used.**
- Tracking: **none.** No IDFA, no analytics, no ads.

## Apple review notes (health-app scrutiny)
- In-app medical disclaimer shown on onboarding and About screens.
- No insulin/dosage calculation, no treatment recommendation, no diagnostic claim.
- Description phrased as "log and track", keeping the app in the wellness category rather than a regulated medical device.

## Age rating
- No objectionable content. Vietnam/US: general audience. (Apple 4+, Google "Everyone".)
```

- [ ] **Step 2: Write the screenshot checklist**

`docs/store/screenshots.md`:

```markdown
# Screenshot Checklist (capture in Vietnamese, vi locale)

Capture on a real device or simulator with the app in Vietnamese. Both stores want the primary flows.

Screens to capture:
1. Log tab — a reading entered, showing the large value + meal chips.
2. History tab — list with a few readings, one out-of-range (colored).
3. Trends tab — 30-day chart with the target band + a tooltip open, stat tiles visible.
4. Target Range settings — the two editable ranges.
5. Export settings — the range picker (bonus).

Device sizes required:
- iOS: 6.7" (iPhone 15 Pro Max) and 6.5"/6.9" as required by App Store Connect at submission.
- Android: phone screenshots (min 2, up to 8), 16:9 or 9:16.

Tips:
- Use realistic but fake data (no real person's readings).
- Keep system font at default scale for the hero shots; optionally one at 1.3× to show accessibility.
```

- [ ] **Step 3: Verify the files exist and are non-empty**

Run: `for f in docs/store/compliance.md docs/store/screenshots.md; do test -s "$f" && echo "$f OK" || echo "$f MISSING"; done`
Expected: both print `OK`.

- [ ] **Step 4: Commit**

```bash
git add docs/store/compliance.md docs/store/screenshots.md
git commit -m "docs: store compliance answers and screenshot checklist"
```

---

## Task 7: Icon polish carried over from Session 9 (asset + on-device verification)

**Context:** Session 9 deferred three icon items here (see memory `session-9-accessibility-polish`). Current state: `app.json` uses `adaptiveIcon.backgroundColor #0FA36B` + `foregroundImage android-icon-foreground.png`. These need a real device to judge and PNG editing to fix, so most of this task is **[HUMAN-GATED]** / asset work — do not fake it.

**Files:**
- Modify (only if regenerating): `assets/images/android-icon-foreground.png`, optionally add `assets/images/android-icon-monochrome.png`, `app.json`

- [ ] **Step 1: [HUMAN-GATED] Judge the current adaptive icon on a device**

Build a preview APK (Task 8) or run on an Android 13+ device/emulator. Check the home-screen icon: the green drop glyph should sit inside the circular/squircle mask **without clipping**, occupying roughly the inner 60–66% safe zone.
- If it looks correct → mark items (1) as done, no change needed.
- If the glyph is clipped or too large → regenerate `android-icon-foreground.png` (1024×1024, **transparent background**, drop centered at ~60% of the canvas) and keep `backgroundColor` doing the green fill.

- [ ] **Step 2: (Optional) Add a monochrome themed icon for Android 13+**

If you want a proper themed icon (instead of falling back to the normal icon), export a single-color white-on-transparent glyph to `assets/images/android-icon-monochrome.png` (1024×1024, transparent, the drop silhouette in white), then add to the `android.adaptiveIcon` block in `app.json`:

```json
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
```

Then re-run `npx expo config --type public` and confirm it resolves clean, and `npx tsc --noEmit && npm test` still pass.

- [ ] **Step 3: Commit (only if assets/app.json changed)**

```bash
git add assets/images app.json
git commit -m "fix: android adaptive icon safe-zone and themed monochrome glyph"
```

> If Step 1 shows the icon is already fine and you add no monochrome glyph, there is nothing to commit — record that in the session notes and move on. Do not invent asset changes.

---

## Task 8: [HUMAN-GATED] Build + submit runbook

**Files:**
- Create: `docs/store/submission-runbook.md`

None of these commands run from this environment — they need an Expo login and paid store accounts. Write them down so they're executed correctly by hand.

- [ ] **Step 1: Write the runbook**

`docs/store/submission-runbook.md`:

```markdown
# Submission Runbook (run these yourself — accounts required)

## Prerequisites (accounts)
- Expo account (free) — https://expo.dev
- Apple Developer Program ($99/yr) — for iOS App Store
- Google Play Developer ($25 one-time) — for Play Store

## One-time project setup
1. `npm i -g eas-cli` (or use `npx eas-cli@latest`)
2. `eas login`
3. `eas init` — links this repo to an EAS project and writes `extra.eas.projectId` into `app.json`. **Commit that change:** `git add app.json && git commit -m "chore: link eas project id"`

## Installable build on a real device (satisfies the acceptance criterion)
- Android APK (easiest, sideload): `eas build --platform android --profile preview`
  → download the APK from the build page, install on an Android phone, smoke-test log → history → trends → export.
- iOS on your own device: `eas build --platform ios --profile preview` (requires registering the device UDID when prompted).

## Production store builds
- `eas build --platform all --profile production` → produces AAB (Android) + IPA (iOS).

## Store submission
- Google Play: create the app in Play Console, complete the **Data Safety** form and **Health Apps** declaration using `docs/store/compliance.md`, upload the AAB (or `eas submit --platform android`), add screenshots from `docs/store/screenshots.md` and the description from `docs/store/listing-*.md`, set privacy policy URL.
- Apple: create the app in App Store Connect, complete **App Privacy → Data Not Collected**, upload via `eas submit --platform ios`, add screenshots + description, set privacy policy URL, answer export compliance (already declared `ITSAppUsesNonExemptEncryption: false`).

## Pre-submit checklist
- [ ] Privacy policy live at the URL wired into the About screen.
- [ ] Data Safety (Play) = no data collected/shared.
- [ ] Health Apps declaration (Play) = personal wellness, not medical.
- [ ] App Privacy (Apple) = Data Not Collected.
- [ ] Descriptions contain no diagnose/treat/manage claims.
- [ ] Screenshots captured (vi) for all required device sizes.
- [ ] Installed preview build smoke-tested on a real device.
```

- [ ] **Step 2: Verify the runbook covers each PRD compliance bullet**

Run: `node -e "const t=require('fs').readFileSync('docs/store/submission-runbook.md','utf8'); for(const k of ['Data Safety','Health Apps','Data Not Collected','privacy policy','preview build']){ if(!t.includes(k)) throw new Error('runbook missing: '+k);} console.log('runbook OK')"`
Expected: prints `runbook OK`.

- [ ] **Step 3: Commit**

```bash
git add docs/store/submission-runbook.md
git commit -m "docs: build and store submission runbook"
```

---

## Definition of Done (from CLAUDE.md)

1. **Acceptance (PLAN.md Session 10):** "installable build on a real device; store checklist complete." The installable build is [HUMAN-GATED] (Task 8) — everything needed to produce it (config, profiles) is committed, and the checklist content is drafted. Note in the commit/PR that the actual device install + console form submission are the remaining human steps.
2. `npx tsc --noEmit` and `npm test` pass (Task 1 adds 3 tests; no other task touches app code).
3. App still boots (`npx expo start`) with the new identifiers — the About screen opens the real privacy URL.
4. Committed with conventional commits (per-task above). PLAN.md Session 10's suggested final commit `chore: eas build config and store assets` is effectively split across the per-task commits.

## Self-Review notes

- **Spec coverage:** eas config → Task 4; production builds → Task 8; app.json bundle IDs/permissions/privacy strings → Task 3; privacy page + wire URL → Tasks 1–2; screenshots → Task 6; description vi+en → Task 5; Data Safety + Health declaration + Apple privacy → Task 6; Session 9 deferred icons → Task 7.
- **No unit-test theater:** this session is config/docs; the only genuinely testable behavior (privacy URL is real, not the placeholder) is covered in Task 1. All other tasks use concrete verify commands instead of fabricated tests.
- **Consistency:** the identifier `io.github.GH_HANDLE.sugar` and URL `https://<GH_HANDLE>.github.io/sugar/privacy.html` are used identically in Tasks 1, 3, 5; `urls.test.ts` enforces the URL shape.
```

