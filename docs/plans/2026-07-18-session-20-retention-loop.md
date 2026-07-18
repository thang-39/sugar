# Session 20 — Launch, review & retention loop

## Trạng thái

- **Phần A (Review prompt): ĐÃ LÀM** — tsc + test + lint xanh (11 test mới).
- **Phần B (Weekly summary): ĐÃ LÀM** — tsc + test + lint xanh.
- **Phần C (Feedback + Mã hỗ trợ): ĐÃ LÀM** — tsc + test + lint xanh (5 test mới). Feedback chỉ đặt ở
  **row Settings** + **card Report** (KHÔNG có nút Góp ý trong màn About). Card Pro copy đã sửa.
- **Chưa commit** — gộp cả 3 phần khi xong Session 20.

## Context

Sugar đã xong tới Session 17.5 (local backup). Session 17 (auth) và 18 (cloud backup)
đã bị bỏ. Session 19 (ads) default SKIP. Nên phần tiếp theo là **Session 20** (PLAN-2.md
dòng 218–224): dựng 3 vòng lặp giữ chân + chuẩn bị ra mắt.

Mục tiêu: (1) xin đánh giá store đúng thời điểm cảm xúc tốt nhất — ngay sau lần **xuất PDF
thành công đầu tiên**; (2) nhắc tổng kết tuần nhẹ nhàng, không tạo áp lực; (3) mở kênh
phản hồi + "Mã hỗ trợ" để hỗ trợ/gỡ lỗi.

Ràng buộc quan trọng: **KHÔNG kéo RevenueCat vào sớm** (native, vỡ Expo Go/jest — để Session 23).
Domain use-case phải pure + test được. Mọi string qua i18n vi + en. Component đọc màu qua `useTheme()`.

## Quyết định đã chốt

- **Cấp Pro cho ~10 mẹ phỏng vấn = License testers (KHÔNG thủ công per-person).** Dán email 10 mẹ
  vào Google Play Console (License testing) **một lần** → mỗi mẹ tự bấm "Nâng cấp Pro" và mua $0.
  Đây là **cấu hình store, thuộc Session 23** — KHÔNG phải code Session 20, thay thế hoàn toàn
  luồng "mẹ gửi mã → dev cấp tay qua dashboard". (Apple: Sandbox testers, cũng ở S23.)
- **"Mã hỗ trợ" GIỮ trong Session 20 nhưng mục đích là HỖ TRỢ/GỠ LỖI**, không phải kênh phát Pro:
  khi mẹ báo "mua Pro rồi mà mất Pro", dev lấy mã (= appUserID) tra đúng tài khoản trong RevenueCat.
  Đi qua entitlement seam: thêm `getAppUserId()` vào `EntitlementRepository` port; dev adapter trả
  mã cục bộ ổn định (lưu ở settings). Trở thành mã thật từ Session 23 (`Purchases.getAppUserID()`),
  About không phải sửa lại.
- **Bỏ mẫu số `/{expected}`** trong copy tổng kết tuần: `{expected}` là số kỳ vọng tự đặt, dễ gây
  cảm giác trách móc (12/28 lần) — trái nguyên tắc "no guilt". Copy chỉ còn count + percent.
- **Nhắc Session 23:** bật License testing (Play) + Sandbox testers (Apple); publish qua closed
  testing (~12 testers, 14 ngày) trước khi mở Production.
- **Design script**: gồm phần mới của Session 20 **và** sửa copy lỗi thời (card Pro "cloud backup · no ads").

---

## Phần A — Review prompt (`expo-store-review`) — ĐÃ LÀM

**Trigger:** ngay sau lần xuất PDF **thành công đầu tiên**. One-shot qua `reviewAskedAt`.
Fallback: reading thứ 20. Không bao giờ hỏi lại.

- Dep `expo-store-review@~9.0.9` (cài với `legacy-peer-deps` — repo có sẵn xung đột peer
  `@react-native/jest-preset` ↔ react). No-op trong Expo Go.
- `AppSettings.reviewAskedAt: number | null` (default `null`) — JSON kv, không migration. Thêm vào
  `settings.ts`, `DEFAULT_SETTINGS`, và load/set trong `use-settings.ts`.
- `src/domain/use-cases/should-ask-review.ts` — `shouldAskForReview({reviewAskedAt, reportCount, readingCount})`:
  `reviewAskedAt == null` VÀ (`reportCount >= 1` HOẶC `readingCount >= 20`). Test: `should-ask-review.test.ts` (4).
- `src/data/review/request-review.ts` — `maybeRequestReview(input, markAsked)`: mark trước, rồi
  `StoreReview.isAvailableAsync()` → `requestReview()`.
- Wire: `app/report.tsx` `onSharePdf` sau `SharePdfStatus.Shared` (primary);
  `app/_layout.tsx` `maybeReviewFallback()` trong effect foreground (fallback reading≥20).

## Phần B — Weekly summary notification — ĐÃ LÀM

Mỗi lần foreground: reschedule id cố định `weekly-summary` cho **CN tới 19:30**. Chỉ khi tuần
(7 ngày gần nhất) có **≥5 readings**. Copy trung tính, không guilt/streak.

- `src/domain/use-cases/build-weekly-summary.ts`:
  `buildWeeklySummary(readings, ranges, now) → { count, percentInRange } | null` (<5 → null,
  dùng `evaluateReading` cho % trong ngưỡng); `nextSundayEvening(now) → Date`. Test (7).
- `scheduleWeeklySummary` / `cancelWeeklySummary` trong `notification-service.ts` (id `weekly-summary`,
  payload kind `'weekly'`, idempotent vì cùng identifier).
- `src/data/notifications/weekly-summary.ts` — `rescheduleWeeklySummary(now?)`: đọc 7 ngày readings
  (`getReadingRepository().list`) + ranges (`getSettingsRepository`) → schedule/cancel.
- Wire: effect foreground (gated `isBooted`) trong `_layout.tsx`; deep-link `weekly` → `/(tabs)/trends`.
- i18n `reminders.notif.weeklyTitle` / `weeklyBody` (nội suy `{{count}}`, `{{percent}}`) — vi + en.

## Phần C — Feedback loop + "Mã hỗ trợ" — CHỜ DESIGN

**C1. Mã hỗ trợ (entitlement seam)**
- Thêm `getAppUserId(): Promise<string>` vào `EntitlementRepository` port.
- `DevEntitlementRepository`: trả mã ổn định — sinh 1 lần bằng `generateId` (`src/data/id.ts`) rồi
  persist qua settings (`supportCode: string | null` trong `AppSettings`). Session 23:
  `RevenueCatEntitlementRepository.getAppUserId()` → `Purchases.getAppUserID()`.
- `app/about.tsx`: row "Mã hỗ trợ" (mono) + nút copy → `expo-clipboard` `Clipboard.setStringAsync`
  → toast/`Alert` "Đã sao chép". Thêm dep `expo-clipboard`.

**C2. Feedback row + card**
- Google Form mở bằng `Linking.openURL` (đã dùng ở `about.tsx:21` — không thêm dep). URL const
  trong `src/config/` (placeholder tới khi có form thật).
- Settings: row "Góp ý cho Sugar" (`app/(tabs)/settings/index.tsx`, `SettingRow`).
- Report: feedback card sau lần export đầu (`reportCount >= 1`), CTA mở form. Dùng `Card`/`ProPromoCard`
  làm mẫu, đặt sau khối Button export.

**i18n phần C (chưa thêm):** `screens.settings.about.supportCode` (+ hint + copied),
`screens.settings.feedback` (+ subtitle), `screens.settings.report.feedbackCard.*`.

## Verification

1. `npx tsc --noEmit` + `npm test` + `npm run lint` xanh. ✅ (A+B)
2. `npx expo start` → Report → xuất PDF lần đầu → **hộp thoại đánh giá đúng 1 lần** (lần 2 không hiện).
3. DEV: `getAllScheduledNotificationsAsync()` có đúng **một** id `weekly-summary`, đúng CN kế 19:30;
   tuần <5 readings thì không có.
4. About → "Mã hỗ trợ" copy được; Settings/Report → row/card "Góp ý" mở form. (phần C)
5. Đổi mode general↔gestational → UI mới re-theme (Evergreen↔Rose). (phần C)

Commit (cuối session): `feat: review prompt, weekly summary, feedback loop`

---

## Phụ lục — Script tiếng Anh cho Claude Design

(Review prompt = OS-native, weekly summary = OS notification → không cần design.)

```
CONTEXT
This is "Sugar", an existing mobile app for Vietnamese pregnant women (gestational diabetes)
and general users tracking blood sugar. It already has a full design in this file. Keep the
existing design system EXACTLY: same layout, spacing, radius, typography, cards (white rounded
20px, soft shadow 0 3px 12px rgba(27,43,36,.05)), pill buttons, Nunito bold weights, Material
Symbols Rounded icons. The app is theme-per-mode: general = Evergreen (green, --brand #0FA36B,
--surface #E9F5EF) and gestational = Rose (pink). Use the existing --brand / --surface / var()
tokens so every new element re-themes automatically. All copy is Vietnamese (the app ships vi + en).
Elderly-friendly: large text (≥14.5px in rows), high contrast, minimal steps.

I need you to ADD 4 things and FIX 1 outdated line. Do NOT redesign anything else.

------------------------------------------------------------
1) NEW SCREEN — "Giới thiệu" (About detail screen)
Today the Settings tab has a static "About / Sugar v1.0.0" row. Turn it into a pushable detail
screen (same header + back-arrow pattern as the other secondary screens like Reminders/Report).
Screen contents, top to bottom:
  - Hero block: big app name "Sugar" (900 weight) + muted version line "Phiên bản 1.0.0".
  - A white card with the centered wellness disclaimer: "Chỉ theo dõi sức khỏe cá nhân — không
    phải thiết bị y tế."
  - A "Mã hỗ trợ" row inside a card: label "Mã hỗ trợ" on the left with a small helper caption
    under it ("Gửi mã này cho chúng tôi khi cần hỗ trợ"), a monospace code value in the middle
    (placeholder e.g. "SGR-8F3A-1C2D"), and a copy icon-button (content_copy) on the right.
    Show a subtle confirmation state / toast "Đã sao chép" after tapping copy.
  - The existing "Chính sách bảo mật" (privacy) ghost link button with shield icon.
  (NOTE: do NOT add a feedback button here — feedback lives only in the Settings list
   row and the Report card, not on this About screen.)
  Keep it calm, lots of vertical breathing room (gap ~20px), one column.

------------------------------------------------------------
2) NEW — Feedback card on the Doctor Report (PDF) screen
On the Report screen, AFTER the export button, add a friendly, warm feedback card that appears
once the user has exported at least one report. Card design:
  - Rounded card using --surface tint (theme-aware), a chat/heart icon,
  - Title: "Sugar có giúp ích cho mẹ không?"
  - One-line subtitle: "Một góp ý nhỏ của mẹ giúp Sugar tốt hơn mỗi ngày."
  - A pill CTA "Gửi góp ý" with a small arrow, using --brand.
  Make it feel like an invitation, not a nag. It should NOT look like an error/warning.

------------------------------------------------------------
3) NEW — Feedback row in the Settings list
Add a new settings row "Góp ý cho Sugar" (icon chatbubble_outline / rate_review, a neutral/blue
accent), with a chevron on the right, placed just above or beside the "About" row. Same row style
as the existing Settings rows (icon + bold label + chevron, 15px 18px padding, hairline divider).

------------------------------------------------------------
4) FIX — Outdated Pro card copy
The "Sugar Pro" upsell card currently says: "Unlimited PDF reports · cloud backup · no ads".
Cloud backup and ads are NOT part of this app anymore. Replace that subtitle with the real Pro
benefits, in Vietnamese: "Báo cáo PDF không giới hạn · không watermark · xuất CSV · phân tích Theo bữa".
Keep the same card visual (brand background, premium badge, UPGRADE pill).

------------------------------------------------------------
STYLE REMINDERS
- Reuse existing tokens/vars (--brand, --surface, --border, primary), don't hardcode new greens/pinks.
- Icons: Material Symbols Rounded (msr), matching current sizes (22px in rows, 20px chevrons).
- Every new text string in Vietnamese, elderly-friendly sizes.
- After you're done, export the updated HTML so it can be diffed back into the app's theme/primitives.
```
