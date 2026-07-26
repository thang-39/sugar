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

> **Đã xác nhận trên máy thật 26/07/2026 (bản trước fix):** 2.1 kill/mở lại ✅ · 2.2 offline ✅ · 2.3 cài lại ✅.
> Ba mục này giữ nguyên kết quả cho bản mới (fix không đổi đường code của chúng) — chỉ cần soi lại 2.1 một lần cho chắc.
> **Còn lại phải test trên bản mới:** 2.4 huỷ giữa luồng (+ nút Restore, xem 2.3) và 2.5 mã hỗ trợ.

### 2.1 Kill app → mở lại → Pro còn giữ ✅ (26/07)
- [x] Xác nhận đang Pro (bảng trên).
- [x] Kill hẳn app (swipe khỏi recents, không phải chỉ về home).
- [x] Mở lại → vẫn Pro.

Đường code: boot → `initEntitlement()` → `Purchases.configure()` → `refresh()` → `getCustomerInfo()`.
Nếu fail: kiểm mạng lúc mở lại; nếu vẫn fail thì RC entitlement `pro` không Active trong Dashboard → xem Customers.

### 2.2 Offline → Pro còn giữ ✅ (26/07)
- [x] Bật chế độ máy bay.
- [x] Kill app → mở lại → **vẫn Pro**.
- [x] Mở Báo cáo → nút CSV vẫn mở khoá.
- [x] Tắt máy bay, foreground lại → vẫn Pro (`AppState` → `refresh()`).

Pass ngay trên bản **trước** fix #1 — vì cache offerings của RC còn nóng nên `getOfferings()` không fail.
Nghĩa là fix #1 không phải chữa một lỗi đã tái hiện được, mà **bỏ sự phụ thuộc**: `isPro` không còn đi chung
`Promise.all` với lần lấy giá, nên cold start offline lúc cache nguội cũng không thể khoá user đã trả tiền.

Lưu ý **không phải bug**: user **chưa** Pro mà mở paywall khi offline thì nút mua bị disable vì không lấy được giá
(`priceString === undefined` → `ctaLoading`). Đúng theo nguyên tắc "giá luôn từ store, không hardcode".

### 2.3 Cài lại → Pro về ✅ (26/07)
- [x] Gỡ app (mất hết dữ liệu local + anon ID cũ).
- [x] Cài lại → mở → **Pro về ngay, không cần bấm "Khôi phục"**.
- [ ] Kiểm RC Dashboard → customer cũ được alias, không sinh giao dịch mới.

Tự về vì RC SDK trên Android lúc `configure()` sẽ sync các purchase mà account Google đang sở hữu → alias anon ID
mới vào customer cũ. Kết quả người dùng thấy là đúng cái cần.

**Kéo theo: nút "Khôi phục giao dịch" vẫn chưa bấm thử lần nào** — nó chỉ bấm được khi app *chưa* nhận ra Pro,
mà account này không tái tạo được trạng thái đó nữa. → Test kèm ở 2.4 bằng account thứ hai (chưa mua):
bấm Restore phải ra alert "chưa tìm thấy giao dịch nào", không crash, không tự mở Pro.

Lưu ý: **mã hỗ trợ sẽ đổi sau khi cài lại** (RC sinh anon ID mới) — đúng như thiết kế, không phải lỗi.
"Stable" ở đây nghĩa là ổn định qua kill/mở lại, không phải qua reinstall.

### 2.4 Reset trạng thái "đã mua" → huỷ giữa luồng + Restore rỗng

Vướng thực tế: account tester **đã sở hữu** `sugar_pro_lifetime` (non-consumable) nên bấm mua lại ra
`ITEM_ALREADY_OWNED` → app tự restore (commit `80bb7d7`) chứ không vào được sheet thanh toán.
Phải **refund + revoke** để account thôi sở hữu.

> ⚠️ **Refund mà không revoke = kẹt.** Refund suông qua Play Console vẫn để lại entitlement → Google tiếp tục báo
> "Bạn đã sở hữu mặt hàng này" và không có đường reset gọn. Luôn dùng đường có revoke.

> **Kết quả thật 26/07 — phải làm CẢ HAI.** Play Console revoke đúng ở phía Google (sheet thanh toán mở lại được),
> nhưng RevenueCat **không tự cập nhật**: customer vẫn `Sugar Pro · Active` rất lâu sau đó, không có event void.
> Mà app đọc `isPro` từ RC → app vẫn Pro → paywall hiện màn "đã mở khoá", không có nút Mua để test.
> Phải vào RC refund thủ công nữa mới xong. **Lần sau: refund từ RC trước** (đúng như RC khuyến nghị), đừng làm ngược.

**Cách A (đã dùng 26/07 — Play Console, đủ):** Play Console → **Order management** → tìm đơn
(`Product name` sẽ ghi "Th.nghiệm: Sugar Pro" = đơn test) → mở đơn → **Refund order** →
để nguyên ô **☑ Remove entitlement** (đây *là* revoke) → Refund percentage 100 → **Refund**.
Đơn license tester không có tiền thật, con số 149.000₫ chỉ là sổ sách.

> Đừng lẫn hai nút cùng tên: "Remove entitlement" **trong Play Console** revoke ở phía Google — đúng cái cần.
> "Remove entitlement" **trong RC Dashboard** chỉ sửa sổ sách RC, Google vẫn thấy account sở hữu → không dùng thay.

Sau đó Google đẩy `VOIDED_PURCHASE` qua Pub/Sub (đã cấu hình ở Session 24) → RC rớt entitlement trong vài phút.
Quá ~10 phút mà RC vẫn Active thì RTDN chưa tới → lúc đó mới vào RC refund để đồng bộ hai bên.

**Cách B (nếu Play Console không cho refund — RevenueCat tự revoke):**
1. RC Dashboard → **Customers** → mở customer (cách tìm: xem ghi chú dưới).
2. **Customer History** → click event giao dịch (`Initial purchase`) → nút **Refund** ở góc trên phải → xác nhận.
4. Điều kiện: service account RC↔Play phải có quyền **"Manage orders and subscriptions"** — đã cấp ở Session 24
   lúc chữa credential, nên bấm được ngay.
5. Muốn sạch hẳn cho lần test sau: **Delete customer** trong RC (xoá transaction + metadata sandbox).

**⚠️ Bật toggle "Sandbox data" (góc trên phải) trước khi đọc bất cứ thứ gì trong RC.**
Giao dịch license tester là **sandbox**, mà mặc định RC ẩn dữ liệu sandbox. Tắt toggle thì Customer profile ghi
"**No current entitlements**" và Customer history không có transaction — **kể cả khi Pro đang Active**. Dấu hiệu nhận
biết đang bị ẩn: banner "This Customer has sandbox purchases" + nút "Show sandbox data". Nút **Refund** nằm trên
chính event giao dịch, nên toggle tắt cũng không thấy nút.
Hệ quả cho bước verify: phải bật sandbox rồi ghi nhận `pro` Active **trước** khi refund, refund xong xem lại — chứ
"No current entitlements" ở cả hai lượt thì không kết luận được gì.

**Tìm customer trong RC — đừng tra bằng mã hỗ trợ (kinh nghiệm 26/07):**
- Ô filter tên là "**Original app user ID**". Sau khi cài lại app, máy có anon ID **mới**; với
  `Transfer Behavior: Transfer to new App User ID` thì RC gắn nó làm **Alias #1** của customer gốc.
  Danh sách chỉ hiện ID **gốc** → tra ID hiện tại **không khớp dòng nào**.
  *(Thực tế 26/07: About hiện `e9e2dfaf…b51ef9`, danh sách hiện `$RCA••••f3f6`; mở customer ra thì `…1ef9` nằm ở
  mục **App User IDs → Alias #1**.)*
- Nếu mã trong About là **UUID có gạch** (`e9e2df-…`) và không có prefix `$RCAnonymousID:` thì đó là id của
  **dev adapter** (`randomUUID()` lưu ở settings key `supportCode`) — tức đang mở Expo Go / APK cũ, RC không hề biết id đó.
  RC anon id là `$RCAnonymousID:` + 32 hex liền, không gạch.
- Cách nhanh: lọc theo **cờ quốc gia** (máy VN → các dòng cờ Việt Nam), mở từng dòng, xem **App User IDs** có alias
  khớp mã hiện tại không.
- **Đừng tìm bằng cột `Spent` / `Latest Purchase`**: sandbox nên các cột đó là `-`, `Total Spent USD 0` và
  Total revenue `$0` ở mọi dòng — không phản ánh việc đã có giao dịch.

**Kiểm dứt điểm (áp dụng cho cả hai cách):** sau refund, bấm Mua trong app.
Sheet thanh toán Google mở ra = revoke đã ăn. Vẫn "Bạn đã sở hữu mặt hàng này" = Google còn thấy sở hữu.

**Sau khi refund:**
- [ ] Đợi vài phút (RTDN qua Pub/Sub đã cấu hình → RC rớt entitlement) → kill app → mở lại → app về **Free**.
- [ ] RC → customer → **bật Sandbox data** → entitlement `pro` **không còn Active**.

Không mất tiền thật: license tester dùng test payment method, đơn này chỉ là đơn test.

**Rồi test 3 thứ trong một lượt:**
- [ ] **Restore rỗng:** paywall → "Khôi phục giao dịch" → alert "chưa tìm thấy giao dịch nào", không crash, không tự mở Pro.
      *Chỉ test được trong cửa sổ chưa-sở-hữu này — mua lại là mất cơ hội.*
- [x] **Huỷ giữa luồng ✅ (26/07):** bấm "Mở khóa Sugar Pro" → sheet Google hiện → bấm back → thoát bình thường.
      Sheet mở được cũng là bằng chứng revoke phía Google đã ăn.
      (`PURCHASE_CANCELLED_ERROR` → `outcome: 'Cancelled'` → không set state, `isBusy` reset trong `finally`.)
- [ ] **Mua lại** → Pro về → giao dịch mới hiện trong RC (đóng luôn vòng purchase lần 2).

**Bonus đáng làm — các cửa gate Free chưa từng test với adapter thật** (Session 16 chỉ test bằng dev adapter):
- [ ] PDF lần 1 xuất được (free), lần 2 → paywall `report_gate`.
- [ ] PDF free **có** watermark "Tạo bởi app Sugar"; sau khi mua lại thì **không** còn.
- [ ] Nút CSV khoá → paywall `csv_gate`.
- [ ] Trends → "Theo bữa" khoá → paywall `charts_gate` (chỉ mode thai kỳ).
- [ ] Ghi/sửa/xoá chỉ số + nhắc đo **không bao giờ bị khoá** (money-principle #1).

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
