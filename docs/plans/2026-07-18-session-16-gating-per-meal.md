# Session 16 — Free/Pro gating + "Theo bữa" (tách 2 phần)

> Kế hoạch để làm ở session mới. Đọc `CLAUDE.md` + `PLAN-2.md` Session 16 (dòng 146–156) + money-principles (dòng 270–278) trước khi bắt đầu. Definition of Done áp dụng cho từng phần.

## Context

Rails paywall (Session 15) đã sẵn sàng: `EntitlementRepository` port + `DevEntitlementRepository`, `useIsPro()`/`useEntitlementStore`, màn `app/paywall.tsx` (đọc `paywallSource`), `PRO_BENEFITS`, `analytics.ts` (6 event). Session 13 đã dựng màn report gộp PDF+CSV và đếm `reportCount`. Nhưng **chưa gate nào được nối vào flow thật** — `useProGate` chưa tồn tại, `app/report.tsx` không đọc entitlement, watermark luôn hiện, nút CSV không khóa, "Theo bữa" trên Trends chưa có.

Thiết kế "Theo bữa" **đã export sẵn** trong `design/Sugar App.dc.html` (segment `Trend line | By meal` dòng 387–390; 4 slot card dòng 430–458; lock overlay dòng 460–469; data demo dòng 1098–1137). Prompt gốc: `design/prompt-theo-bua-advanced-charts.md`.

**Tách 2 phần** (Phần B phụ thuộc `useProGate` của Phần A). Có thể làm 2 session/2 commit riêng.

---

# PHẦN A — 4 gates trên bề mặt sẵn có (không cần design mới)

Hạ tầng gate + Gate 1/2/3 (report/watermark/CSV). Gate 4 (charts) nằm ở Phần B vì cần UI "Theo bữa" để khóa.

## A1 — Helper dùng chung `useProGate`
**File mới:** `src/ui/hooks/use-pro-gate.ts` (+ `__tests__/use-pro-gate.test.ts`)

Money-principle #2 (mọi gate một cửa):
```ts
export function useProGate(): {
  isPro: boolean;
  requirePro: (source: PaywallSource) => boolean; // true = đã Pro cứ chạy; false = đã mở paywall
};
```
- `isPro` từ `useIsPro()` (`src/ui/hooks/use-entitlement.ts`).
- `requirePro(source)`: Pro → `true`; ngược lại `router.push({ pathname:'/paywall', params:{ paywallSource: source } })` rồi `false`.
- Dùng `PaywallSource` từ `src/domain/models/paywall.ts`.
- Test: mock `expo-router`; non-Pro → push đúng source + trả false; Pro → không push + trả true.

## A2 — Gate report screen (`app/report.tsx`)
- **Gate 1 (PDF lần 2):** đầu `onSharePdf`: `if (reportCount >= 1 && !requirePro(PaywallSource.ReportGate)) return;` (`reportCount === 0` → xuất free). Check trong handler để paywall hiện copy `report_gate`.
- **Gate 2 (watermark):** `renderReportHtml` đã optional watermark (`report-html.ts:99`). Truyền `watermark: isPro ? undefined : t('screens.settings.report.watermark')`. Ẩn `watermarkNote` (report.tsx:316-320) khi `isPro`.
- **Gate 3 (CSV):** đầu `onExportCsv`: `if (!requirePro(PaywallSource.CsvGate)) return;`. Thêm icon khóa nhỏ trên nút/tab CSV cho non-Pro (visual affordance).
- **Analytics:** gọi `analytics.reportExported(reportCount + 1)` ở nhánh `SharePdfStatus.Shared` (cạnh chỗ tăng `reportCount`) — hiện chưa gọi ở đâu.
- Import thêm: `useProGate`, `PaywallSource`, `analytics`.

## A3 — Verify Phần A
- `npx tsc --noEmit` + `npm test` (test `use-pro-gate`) xanh.
- Chạy app, dùng `devPro` toggle (Settings): free → PDF lần 1 xuất được (có watermark), `reportCount`→1; lần 2 Share PDF → paywall `report_gate`; CSV → paywall `csv_gate`. devPro on → PDF không watermark + không giới hạn, CSV mở.
- Commit: `feat: pro gating for report, watermark, csv export`.

---

# PHẦN B — "Theo bữa" (advanced charts) + Gate 4

## B0 — Reconcile design → theme (bắt buộc, CLAUDE.md "không đoán token")
Đọc block Trends "By meal" trong `design/Sugar App.dc.html` (markup ~427–471, data ~1098–1137) và map hex sang token `useTheme()`:

| Design | Token |
|---|---|
| `var(--surface)` (icon tile, delta improved bg) | `colors.surface` |
| `{{ primary }}` (avg tốt, bar fill, lock tile) | `colors.brand`/primary |
| `#E8622C` (avg xấu, delta worse) | `colors.high`/outOfRange |
| `#8A9A91` (label phụ, empty) | `colors.textMuted`/textFaint |
| `#F1F6F3` (bar track, delta trung tính) | surface nhạt |

Thiếu token → bổ sung `src/ui/theme/colors.ts` cho cả `evergreen` + `rose`, không hardcode hex trong component.

## B1 — Domain `computeSlotStats` (pure, tested)
**File mới:** `src/domain/use-cases/compute-slot-stats.ts` (+ `__tests__/compute-slot-stats.test.ts`)
```ts
interface SlotStat {
  slotId: string; mealType: MealType; mealTiming: MealTiming;
  count: number;
  average?: number;        // mg/dL, undefined khi count === 0
  percentInRange: number;  // 0 khi count === 0
  deltaAverage?: number;   // average kỳ này − kỳ trước (mg/dL); undefined nếu thiếu kỳ trước
}
export function computeSlotStats(
  readings: readonly Reading[],
  range: { from: number; to: number },
  protocol: AfterMealProtocol,
  ranges: TargetRanges,
): SlotStat[];  // 4 slot: Đói, After Breakfast/Lunch/Dinner
```
Tái dùng tối đa:
- **Slot defs:** trích `reportSlotDefs(protocol)` (đang private trong `build-report.ts:25-33`) ra helper chung `buildSlotDefs(protocol)` đặt tại `get-day-slots.ts` (nơi `SlotDef` sống); `build-report.ts` + `compute-slot-stats.ts` cùng import. **Lọc còn 4 slot** đúng thứ tự design (Đói + 3 After), bỏ before-lunch/dinner.
- **Gom:** lặp từng ngày trong `[from,to]` → `getDaySlots(readings, day, slotDefs)`, dồn `reading`(+`followUp`) vào slot theo `def.id`.
- **In-range:** `evaluateReading(reading, ranges)` (tự chọn band 1h/2h) đếm `=== 'in-range'`.
- **Delta:** hàm nội bộ `aggregate(readings, range, defs, ranges)` chạy cho kỳ này và kỳ trước liền kề (`from′ = from − (to−from)`, `to′ = from`); `deltaAverage = avgNow − avgPrev`. Âm = tốt hơn (đường huyết giảm) → UI ▼ xanh; dương = ▲ cam.
- Pure TS, không React/Expo.

**Test** (mirror `get-day-slots.test.ts`): slot trùng (primary+followUp), slot rỗng, delta kỳ trước, Snack không vào slot, band 2h dùng `postMeal2h`, dấu delta.

## B2 — Refactor an toàn
Trích `buildSlotDefs` khỏi `build-report.ts` → chạy lại `build-report.test.ts` đảm bảo không đổi hành vi.

## B3 — UI Trends "Theo bữa" (`app/(tabs)/trends.tsx`)
Bám markup design (dòng 383–472):
- Thêm `conditionType`, `afterMealProtocol` vào destructure `useSettingsStore()` (hiện chưa có).
- **Chỉ hiện segment khi** `conditionType === ConditionType.Gestational` (KHÔNG guard `dueDate !== null` — phân tích theo bữa không phụ thuộc tuần thai). General mode: không render segment, không đổi gì khác.
- Segment `Xu hướng | Theo bữa` (pill full-width, track `surface`, active trắng có shadow, font 800) — dùng `SegmentedControl`. State `view: 'trend'|'byMeal'` (mặc định `trend`). Scale chips lọc cả 2 view.
- **View `byMeal`:** stack 4 `SlotStatCard` (composite mới, chỉ primitives + theme):
  - Header: icon tile bo góc + tên bữa (font 800) + delta pill phải (▼ xanh cải thiện / ▲ cam xấu / — xám). Icon từ `src/ui/utils/meal-display.ts`; slot Đói cần icon riêng.
  - Body: 3 stat inline — Average (số lớn, đơn vị qua `formatValue(mgdl, preferredUnit)`; màu primary khi %≥80, cam khi <80), In range (%), Readings (count).
  - Thanh in-range mỏng: track nhạt, fill primary theo % width.
  - Empty slot: card mờ + "Chưa có chỉ số trong kỳ này", không stats.
- **Gate 4 — lock overlay (non-Pro):** 4 card blur/opacity 40% + overlay giữa: lock tile primary, tiêu đề "Phân tích theo bữa là tính năng Pro", 1 dòng phụ, nút "Mở khóa Sugar Pro" → `requirePro(PaywallSource.ChartsGate)`. Không đọc được số qua blur.
- `range {from,to}`: lấy số từ `filter`/`rangeFor(scale)` hiện có; scale "all"/custom cần mốc `from/to` rõ để tính kỳ trước — thống nhất với cách chart lấy span (**rủi ro chính**).

## B4 — i18n (vi + en)
`src/i18n/vi.json` + `en.json` song song: nhãn segment, 3 tiêu đề stat, empty-slot, delta a11y, lock overlay title/sub/button. Bổ sung `paywall.context.charts_gate` nếu thiếu. Không hardcode chuỗi, không khóa chết.

## B5 — Verify Phần B
- `npx tsc --noEmit` + `npm test` (`compute-slot-stats` + `build-report` vẫn xanh sau refactor).
- Chạy app: GDM mode → tab "Theo bữa"; non-Pro thấy lock overlay → paywall `charts_gate`; devPro on → 4 slot card đúng số (average/%/count/delta), thanh in-range, empty state.
- General mode: KHÔNG có segment "Theo bữa".
- Rose (gestational) + Evergreen render đúng token.
- Commit: `feat: per-meal analysis (Theo bữa) with pro gate`.

---

## Không đụng tới
- `src/config/pro-benefits.ts` — `perMealAnalysis`/`noWatermark`/`csvExport` đã có, không thêm dòng.
- `DevEntitlementRepository`/factory (RevenueCat = Session 23); không thêm `react-native-purchases`.
- Log/history/sửa/xóa/line chart cơ bản/reminders/settings/**PDF đầu tiên** — không bao giờ gate.
