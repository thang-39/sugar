# Session 23 — Bước 7: nghiệm thu IAP trên máy thật (2026-07-25)

Mục tiêu: đóng 4 mục acceptance còn lại trong `PLAN-2.md` § Session 23 trước khi làm Bước 8 (nộp Play).
Bối cảnh đã xong: credential RC↔Play xanh cả 3 mục, một giao dịch internal-test đã thành công, customer hiện trong RC Dashboard.

---

## 0. Hai lỗi code đã sửa trước khi test (commit này)

Cả hai đều **nằm đúng trong 4 mục acceptance** — nếu không sửa thì test chắc chắn fail và mất một vòng build EAS.

1. **Offline làm mất Pro** — `useEntitlementStore.refresh()` gộp `isPro()` + `getProProduct()` vào một `Promise.all`.
   RevenueCat vẫn trả `getCustomerInfo()` từ cache khi offline, nhưng `getOfferings()` có thể fail vì mạng →
   cả `refresh()` reject → `set()` không chạy → `isPro` đứng ở default `false` → **user đã mua bị khoá khi bật máy bay**.
   Sửa: `Promise.allSettled`, mỗi bên fail thì **giữ giá trị cũ**, không bao giờ xoá. (`src/ui/hooks/use-entitlement.ts`)

2. **Mã hỗ trợ hiện sai trên bản RevenueCat** — chỉ dev adapter format mã; `RevenueCatEntitlementRepository.getAppUserId()`
   trả `$RCAnonymousID:<32 hex>` thô, và About render nó trong một `flexDirection: 'row'` thiết kế cho chuỗi 13 ký tự → vỡ layout.
   Bẫy kèm theo: nếu format thẳng chuỗi thô thì **mọi user đều ra `SGR-RCAN-ONYM`** (prefix giống nhau).
   Sửa: port trả **id thô** (để tra trong RC Dashboard), `formatSupportCode()` strip prefix `$RCAnonymousID:`,
   About **hiện mã ngắn** `SGR-XXXX-XXXX` nhưng **copy id thô**. (`format-support-code.ts`, `entitlement-repository.ts`, `dev-entitlement-repository.ts`, `app/about.tsx`)

→ `tsc` sạch, 285 tests xanh, lint sạch.

**Phải build lại**: repo **không có `expo-updates`**, nên không đẩy được bản sửa JS qua EAS Update.

> ⚠️ **Và phải cài từ Google Play, không sideload.** Play Billing so chữ ký app đang chạy với chứng chỉ
> app-signing trên Play; APK từ EAS ký bằng *upload key*, bản qua Play do Google ký lại → sideload thì luồng
> mua ném `DEVELOPER_ERROR`. Nên dùng **AAB → track Internal testing**, đúng đường mà giao dịch trước đã chạy.

```bash
eas build -p android --profile production      # ra .aab; profile này đã có EXPO_PUBLIC_RC_ANDROID_KEY
```
Play Console → Testing → **Internal testing** → Create new release → upload `.aab` → Start rollout.
`appVersionSource: "remote"` + `autoIncrement` → EAS tự tăng `versionCode`, không phải sửa `app.json`.

**Bản này chính là artifact của Bước 8** — nghiệm thu xong thì Play cho *promote* release từ Internal testing
lên Production, không build lại lần nữa.
*(Ghi chú nợ kỹ thuật: `PLAN-2.md` Session 21 ghi "links vật tư cập nhật qua EAS Update (JS-only)" — hiện chưa đúng vì chưa cài `expo-updates`. Không chặn Bước 7/8.)*

---

## 1. Chuẩn bị máy

- [ ] Đợi Play xử lý bản mới (vài phút) → máy tester update **từ Play Store**, hoặc mở lại link opt-in internal testing.
- [ ] Nếu máy đang cài bản sideload cũ: **gỡ trước** (`adb uninstall io.minhthang.sugar`) rồi cài từ Play — hai bản khác signing key nên không update chồng nhau được.
- [ ] Google account trên máy **vừa là internal tester vừa là license tester** (Bước 6) — thiếu license tester thì bị charge tiền thật.
- [ ] Bản production là **release build** → `__DEV__` false → **không có toggle `devPro`** trong Settings, không có RC debug log. Mọi thứ phải quan sát qua UI.

**Cách đọc trạng thái Pro (không có dev tool):** bất kỳ dấu hiệu nào dưới đây, chọn 1–2 cái nhanh nhất:
| Nơi | Free | Pro |
|---|---|---|
| Settings → hàng "Sugar Pro" | mở paywall | "Đã mở khóa ✓" |
| Báo cáo bác sĩ → nút CSV | icon ổ khoá → paywall | mở thẳng share sheet |
| PDF xuất ra, footer | có "Tạo bởi app Sugar" | **không** watermark |
| Trends → segment "Theo bữa" (chỉ mode thai kỳ) | lock → paywall | xem được |
| PDF lần thứ 2+ | paywall `report_gate` | xuất thẳng |

---

## 2. Bốn mục acceptance

Làm **đúng thứ tự** — mục 2.4 phá trạng thái "đã sở hữu" nên để cuối.

### 2.1 Kill app → mở lại → Pro còn giữ
- [ ] Xác nhận đang Pro (bảng trên).
- [ ] Kill hẳn app (swipe khỏi recents, không phải chỉ về home).
- [ ] Mở lại → vẫn Pro.

Đường code: boot → `initEntitlement()` → `Purchases.configure()` → `refresh()` → `getCustomerInfo()`.
Nếu fail: kiểm mạng lúc mở lại; nếu vẫn fail thì RC entitlement `pro` không Active trong Dashboard → xem Customers.

### 2.2 Offline → Pro còn giữ
- [ ] Bật chế độ máy bay.
- [ ] Kill app → mở lại → **vẫn Pro** (đây là mục lỗi #1 vừa sửa).
- [ ] Mở Báo cáo → nút CSV vẫn mở khoá.
- [ ] Tắt máy bay, foreground lại → vẫn Pro (`AppState` → `refresh()`).

Lưu ý **không phải bug**: user **chưa** Pro mà mở paywall khi offline thì nút mua bị disable vì không lấy được giá
(`priceString === undefined` → `ctaLoading`). Đúng theo nguyên tắc "giá luôn từ store, không hardcode".

### 2.3 Cài lại → Restore
- [ ] Gỡ app (mất hết dữ liệu local + anon ID cũ).
- [ ] **Cài lại từ Play** (link internal testing) — không sideload, nếu không billing/Restore sẽ chết.
- [ ] Mở → đang **Free** (bình thường: anon ID mới, chưa alias).
- [ ] Settings → Sugar Pro → paywall → **"Khôi phục giao dịch"** → alert thành công → Pro.
- [ ] Kiểm RC Dashboard → customer cũ được alias, không sinh giao dịch mới.

Lưu ý: **mã hỗ trợ sẽ đổi sau khi cài lại** (RC sinh anon ID mới) — đúng như thiết kế, không phải lỗi.
"Stable" ở đây nghĩa là ổn định qua kill/mở lại, không phải qua reinstall.

### 2.4 Huỷ giữa luồng mua → sạch
Vướng thực tế: license tester **đã sở hữu** `sugar_pro_lifetime` (non-consumable) nên bấm mua lại sẽ ra
`ITEM_ALREADY_OWNED` → app tự restore (commit `80bb7d7`) chứ không vào được sheet thanh toán. Hai cách:

- **Cách A (khuyến nghị):** dùng **Google account thứ hai** — phải **vừa là internal tester** (để cài được app)
  **vừa là license tester** (để không bị charge thật) và chưa mua → máy đổi account hoặc máy khác → mua →
  bấm back giữa sheet Google.
- **Cách B:** Play Console → Order management → **refund/void** đơn test → đợi entitlement rớt → mua lại rồi huỷ.

- [ ] Bấm "Mở khóa Sugar Pro" → sheet Google hiện → bấm back.
- [ ] Kỳ vọng: **không alert lỗi**, vẫn ở paywall, nút mua bấm lại được (không kẹt spinner), app không crash.
  (`PURCHASE_CANCELLED_ERROR` → `outcome: 'Cancelled'` → không set state, `isBusy` reset trong `finally`.)

### 2.5 Mã hỗ trợ (mục lỗi #2 vừa sửa)
- [ ] Settings → Giới thiệu → thấy **`SGR-XXXX-XXXX`** (không phải chuỗi `$RCAnonymousID:...` dài, không vỡ layout).
- [ ] Bấm copy → dán vào Zalo/notes → phải là **id thô đầy đủ** (`$RCAnonymousID:...`).
- [ ] Dán id đó vào ô search Customers của RC Dashboard → ra đúng customer.
- [ ] Kill/mở lại → mã **không đổi**.

*(Nếu mẹ gõ tay mã ngắn thay vì copy mà RC tìm không ra, bảo mẹ bấm nút copy — đó là lý do clipboard giữ id thô.)*

---

## 3. Xong thì

- [ ] Tick 4 checkbox trong `PLAN-2.md` § Session 23 → _Remaining (Bước 7)_ + tick mục _Polish_ `PRODUCT_ALREADY_PURCHASED_ERROR` (đã làm ở commit `80bb7d7`).
- [ ] Ghi kết quả + bất ngờ gặp phải vào phần progress log của `PLAN-2.md`.
- [ ] Sang **Bước 8**: Play Console → Internal testing → release vừa nghiệm thu → **Promote release → Production**
      (không build lại nếu không vá thêm code). Các bước tay: `docs/plans/2026-07-18-session-23-admin-handoff.md`.
