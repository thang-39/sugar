# Session 6 — Target ranges + alerts + settings screens

## Context
Session 6 của `PLAN.md` (stories 33–36, 43, 46, 53–55). Toàn bộ 5 màn trong `app/(tabs)/settings/` hiện là `PlaceholderScreen`; chỉ `_layout.tsx` đã wire Stack (index / target-range / export / about). Hạ tầng đã sẵn: settings model 6 keys, SQLite upsert, `useSettingsStore` (`updateSetting` đã tự gọi `i18n.changeLanguage` khi đổi `preferredLanguage`), `evaluateReading`, conversion helpers, primitives (SegmentedControl, Stepper, Card, Button `dangerOutline`). **Alert out-of-range khi lưu đã được wire sẵn** trong `log-reading-form.tsx` (`showSavedAlert` đã tôn trọng `alertsEnabled`) — Session 6 chỉ dựng UI cấu hình, không dựng lại luồng alert.

Mục tiêu: người dùng chỉnh được 2 target range, bật/tắt cảnh báo, đổi đơn vị, đổi ngôn ngữ vi/en (re-render tức thì), xem About (version + disclaimer + link privacy), và xoá toàn bộ dữ liệu. Export để nguyên placeholder (Session 7).

## Quyết định đã chốt với người dùng
1. **Target range chỉnh theo đơn vị ưa thích** (PRD authoritative). mg/dL: step 5, bounds [20,600]. mmol/L: step 0.1, 1 số lẻ, bounds [1.1,33.3]; convert sang mg/dL khi lưu.
2. **Tạo `Toggle` primitive** dạng track+knob khớp design Evergreen (xanh khi bật).
3. **Delete-all: 2 hộp thoại `Alert.alert`** (cảnh báo mất vĩnh viễn → xác nhận cuối). Không typed/press-hold (elderly-first).

## Lưu ý PRD vs design
- Design (`design/Sugar App.dc.html`) ghi target range "Values in mg/dL" → **theo PRD, làm theo đơn vị ưa thích** (đã chốt), thêm helper text nêu rõ đơn vị hiện tại.
- Design **không có** language switch, About screen điều hướng, và delete-all → 3 phần này là net-new (đúng theo stories 53/55/54).
- Design Unit dùng pill-toggle; ta dùng **SegmentedControl** cho cả Unit và Language (2 lựa chọn đều hiển thị, target lớn — hợp elderly-first). Ghi nhận đây là sai lệch nhỏ có chủ đích so với design.

---

## Hạng mục công việc

### A. Domain + data: xoá toàn bộ dữ liệu
- Port `src/domain/repositories/reading-repository.ts`: thêm `deleteAll(): Promise<void>`.
- Adapter `src/data/repositories/sqlite-reading-repository.ts`: impl `deleteAll` (`db.delete(readings)`).
- Port `src/domain/repositories/settings-repository.ts`: thêm `clear(): Promise<void>`.
- Adapter `src/data/repositories/sqlite-settings-repository.ts`: impl `clear` (`db.delete(appSettings)`). Vì `get()` fallback về `DEFAULT_SETTINGS` khi thiếu row → xoá hết row = reset về mặc định, không migrate.
- Use case mới `src/domain/use-cases/clear-all-data.ts`: `clearAllData(deps: { readingRepo, settingsRepo }): Promise<void>` gọi `readingRepo.deleteAll()` + `settingsRepo.clear()`. Deps injected theo pattern `deleteReading`.

### B. Primitive mới: `Toggle`
- `src/ui/components/ui/toggle.tsx`: props `{ value: boolean; onValueChange: (v: boolean) => void; accessibilityLabel?; disabled? }`. Track 48×28 radius pill, bg `colors.primary` khi on / `colors.border`(mint-grey) khi off; knob trắng 22px, `Animated` dịch left 3↔23. `accessibilityRole="switch"`, `accessibilityState={{ checked: value }}`. Token từ theme, không hardcode hex.
- Export trong `src/ui/components/ui/index.ts`.

### C. Composite mới: `SettingRow` (+ nhóm)
- `src/ui/components/setting-row.tsx` (screen composite, giống StatCard/ListRow): props `{ icon: IoniconsName; iconColor: string; label: string; value?: string; trailing?: ReactNode; onPress?: () => void; isLast?: boolean }`.
  - Layout: icon 22px màu `iconColor` → label flex-1 (`AppText weight="extrabold"`) → `trailing` (Toggle/SegmentedControl) HOẶC `value` muted + chevron (khi có `onPress` và không có `trailing`).
  - Divider `colors.divider` inset dưới mỗi row trừ `isLast`.
- Bọc nhóm bằng `Card` (padding 0, `overflow:hidden`). Không tự viết StyleSheet cho card.

### D. Màn Settings index — `app/(tabs)/settings/index.tsx`
Đọc `useSettingsStore`. ScrollView, các nhóm:
1. **Preferences** (Card + SettingRow):
   - Đơn vị: icon `resize`(green), trailing `SegmentedControl` mg/dL|mmol/L → `updateSetting('preferredUnit', v)`.
   - Ngôn ngữ: icon `language`(primary), trailing `SegmentedControl` VI|EN → `updateSetting('preferredLanguage', v)` (store tự đổi i18n).
   - Cảnh báo: icon `notifications`(orange), trailing `Toggle` → `updateSetting('alertsEnabled', v)`.
2. **Nhóm điều hướng** (Card + SettingRow onPress):
   - Target ranges: icon `alert-circle`(purple), value = summary `low–high / low–high` theo đơn vị hiện tại, chevron → `router.push('/(tabs)/settings/target-range')`.
   - Export data: icon `share-outline`(blue), chevron → push export (màn vẫn placeholder).
   - About: icon `information-circle`(grey), chevron → push about.
3. **Danger**: `Button variant="dangerOutline"` "Xoá toàn bộ dữ liệu" → luồng G.
4. Footer disclaimer text (muted, center).

### E. Màn Target Range — `app/(tabs)/settings/target-range.tsx`
- Helper text nêu đơn vị hiện tại.
- 2 card (Fasting/Before — icon `partly-sunny`; After — icon `restaurant`), mỗi card 2 `Stepper` (Min/Max) dùng `formatValue` hiển thị theo đơn vị.
- **Working state giữ theo đơn vị hiển thị**: seed từ mg/dL đã lưu (`mgdlToMmol` nếu mmol). Step 5 (mg/dL) / 0.1 (mmol). Persist: mg/dL lưu thẳng, mmol → `mmolToMgdl` rồi `updateSetting('fastingRange'|'postMealRange', {low,high})`.
- **Ràng buộc low ≤ high** (memory `deferred-domain-validations`): stepper low `max = high hiện tại`, high `min = low hiện tại`; clamp bounds vật lý [20,600] mg/dL (hoặc mmol tương đương).
- Nút "Xong" (`Button primary`) → `router.back()`.

### F. Màn About — `app/(tabs)/settings/about.tsx`
- Version từ `expo-constants` (`Constants.expoConfig?.version`), fallback string.
- Disclaimer (chuỗi PRD vi/en đã có ở onboarding — dùng lại key nếu có, nếu chưa thì thêm).
- Link Privacy policy: `Linking.openURL` với URL placeholder (Session 10 thay thật) — dùng `AppText` link hoặc `Button ghost`.

### G. Luồng delete-all
- `Alert.alert` #1 (cảnh báo permanent) → nút Tiếp tục mở `Alert.alert` #2 (xác nhận cuối, style `destructive`).
- Xác nhận → `await clearAllData({ readingRepo: getReadingRepository(), settingsRepo })` → reset store về defaults + `i18n.changeLanguage('vi')` → `router.replace('/(tabs)')` (Log tab). Onboarding redirect để Session 8.
- Thêm action `resetToDefaults()` vào `useSettingsStore` (set `...DEFAULT_SETTINGS`) và gọi sau wipe. History/Trends tự rỗng nhờ `useFocusEffect` reload trong `use-readings.ts`.

### H. i18n — `src/i18n/vi.json` + `en.json`
Bổ sung dưới `screens.settings`: nhãn rows (unit/language/alerts/targetRanges/export/about), Target Range (helper, Fasting/Before, After, Min/Max, Done, a11y stepper), About (version, disclaimer, privacyPolicy), deleteAll (row label + 2 alert title/message/nút). Giữ cây key vi/en đồng nhất. Không hardcode chuỗi trong component.

---

## Files
**Tạo:** `src/ui/components/ui/toggle.tsx`, `src/ui/components/setting-row.tsx`, `src/domain/use-cases/clear-all-data.ts` (+ test), `src/domain/use-cases/__tests__` cho clear-all, repo tests cho deleteAll/clear.
**Sửa:** 5 file repo (2 port + 2 adapter), `src/ui/components/ui/index.ts`, `src/ui/hooks/use-settings.ts`, `app/(tabs)/settings/{index,target-range,about}.tsx`, `src/i18n/{vi,en}.json`.
**Không đụng:** `_layout.tsx` (about đã đăng ký), `export.tsx` (Session 7), luồng save-alert trong `log-reading-form.tsx`.

## Tests (black-box, in-memory SQLite)
- `clearAllData`: seed readings + settings tuỳ chỉnh → clear → readings rỗng, settings về `DEFAULT_SETTINGS`.
- `SqliteReadingRepository.deleteAll` và `SqliteSettingsRepository.clear`.
- Round-trip range mmol↔mgdl ở biên (dựa helper đã có, nếu chưa cover).

## Verification (end-to-end)
1. `npx tsc --noEmit` + `npm test` xanh (không React import trong `src/domain`).
2. Chạy app (`run`/`verify` skill):
   - Đổi đơn vị ở Settings → Log/History/Trends hiển thị giá trị đã convert, không migrate.
   - Đổi ngôn ngữ VI↔EN → mọi tab đổi chữ tức thì.
   - Target Ranges: chỉnh Min/Max ở cả 2 đơn vị, low không vượt high; summary ở Settings + alert khi lưu reading phản ánh range mới.
   - Tắt cảnh báo → lưu reading out-of-range chỉ hiện "Đã lưu" (không alert range).
   - About: version + disclaimer + link privacy mở được.
   - Xoá toàn bộ: 2 Alert → history rỗng, settings về mặc định (ngôn ngữ vi, đơn vị mg/dL, range mặc định), về tab Log.
3. Kiểm layout ở 1.3× font scale.

## Commit
`feat: settings — target ranges, language, delete all data`
