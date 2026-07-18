# Session 23 — Việc thủ công trên web (RevenueCat + Google Play)

> **Đọc trước:** phần **code đã xong** trên nhánh `feature/session-23-revenuecat` (adapter RevenueCat, seam, config). Tài liệu này chỉ liệt kê **những gì BẠN phải tự làm trên trình duyệt** rồi dán đúng **một dòng key** vào code. Làm tuần tự từ trên xuống. Kèm chi tiết kỹ thuật: `docs/plans/2026-07-18-session-23-revenuecat-launch.md`. Các bước build/listing Android cho người lần đầu: `docs/plans/2026-07-12-session-14-launch-guide.md`.

## Câu hỏi hay gặp: đổi giá có phải sửa code không?

**KHÔNG.** Giá luôn lấy từ store (`product.priceString`). Muốn đổi giá sau này:
- Vào **Google Play Console → Sản phẩm trong ứng dụng → `sugar_pro_lifetime` → sửa giá.**
- RevenueCat tự cập nhật. App hiển thị giá mới ở lần mở kế tiếp — **không build lại, không cập nhật app.**

Bạn **không bao giờ** chạm vào code để đổi giá. Số `149.000₫` chỉ được nhập **một lần trên Play Console** khi tạo sản phẩm (Bước 2 bên dưới) — trong code không hề có con số này.

---

## Các hằng số cố định (dùng lại xuyên suốt — nhập y hệt)

| Thứ | Giá trị | Nhập ở đâu |
|-----|---------|-----------|
| Package name (Android) | `io.minhthang.sugar` | Play Console + RevenueCat |
| Product ID (IAP) | `sugar_pro_lifetime` | Play Console + RevenueCat |
| Giá | `149.000₫` (một lần, non-consumable) | Play Console |
| Entitlement ID | `pro` | RevenueCat |
| Offering ID | `default` | RevenueCat |

> Ba giá trị `sugar_pro_lifetime`, `pro`, `default` **phải khớp tuyệt đối** với những gì code mong đợi (`src/config/revenuecat.ts`). Sai một ký tự → app không mở khoá được.

---

## BƯỚC 1 — Mở tài khoản Google Play Console ($25 một lần)

*(Nếu Session 14 đã làm rồi thì bỏ qua.)*

1. Vào https://play.google.com/console → đăng ký tài khoản nhà phát triển ($25 một lần).
2. Thanh toán bằng **Vietcombank ECard** (thẻ Visa debit): trước đó vào app VCB **bật thanh toán quốc tế** + **giữ đủ số dư**.
3. Vào **Setup → Payments profile**: điền hồ sơ thanh toán (merchant profile) để nhận tiền IAP. Google duyệt mất vài ngày.

> Tài khoản tạo trước 13/11/2023 → không bị bắt buộc closed-testing 12 người/14 ngày, lên production thẳng. Nếu tài khoản mới → phải chừa ~2 tuần cho closed testing.

---

## BƯỚC 2 — Tạo sản phẩm trong ứng dụng (IAP) trên Play Console

> Trước bước này bạn cần đã **tạo app** trong Play Console và **upload ít nhất 1 bản build** (xem launch guide Session 14) — Play không cho tạo IAP nếu chưa có bản build nào.

1. Play Console → chọn app **Sugar** → **Monetize → Products → In-app products**.
2. **Create product**:
   - **Product ID**: `sugar_pro_lifetime`  ← nhập chính xác, không đổi được sau này
   - **Name**: ví dụ `Sugar Pro (trọn đời)`
   - **Description**: ví dụ `Mở khoá toàn bộ tính năng Pro, thanh toán một lần.`
3. **Set price**: `149.000₫`.
4. **Activate** (Save + Activate).

---

## BƯỚC 3 — Tạo project RevenueCat + lấy key

1. Vào https://app.revenuecat.com → tạo tài khoản (miễn phí tới $2,500 doanh thu/tháng).
2. **Create new project** → tên `Sugar`.
3. **Add app → Google Play**:
   - **App name**: `Sugar Android`
   - **Google Play package**: `io.minhthang.sugar`
4. **Entitlements → + New**: identifier `pro`.
5. **Products → + New / Import**:
   - Thêm product `sugar_pro_lifetime` (RevenueCat import từ Play sau khi đã nối ở Bước 4; nếu chưa nối thì nhập tay Product ID).
   - **Attach** product `sugar_pro_lifetime` vào entitlement `pro`.
6. **Offerings → + New offering**: identifier `default` → thêm 1 **package** chứa product `sugar_pro_lifetime`.
7. **Lấy key**: **Project settings → API keys → Google Play → Public app-specific key**. Nó bắt đầu bằng `goog_...`. **Copy** — dùng ở Bước 5.

> Đây là **public key** (chỉ đọc/mua, không quản trị) nên được phép nhúng vào app. **Tuyệt đối KHÔNG** copy "Secret key" hay file JSON service account vào code.

---

## BƯỚC 4 — Nối RevenueCat ↔ Google Play (service account)

Bước này để RevenueCat xác thực được giao dịch mua với Google.

1. Vào https://console.cloud.google.com → tạo **Service Account** (hoặc dùng dự án Google Cloud gắn với Play).
2. Cấp cho service account đó quyền trong **Play Console → Users and permissions**: quyền xem **Financial data** + **Manage orders and subscriptions**.
3. Trong Google Cloud, tạo **key JSON** cho service account đó → tải file `.json` về.
4. Về **RevenueCat → project settings → Google Play → Service Account credentials** → **upload file `.json`** vừa tải.
5. Đợi RevenueCat báo "connected/valid" (có thể mất tới ~36h để Google kích hoạt quyền).

> File `.json` này chỉ upload lên RevenueCat, **không bao giờ commit vào repo**.

---

## BƯỚC 5 — Dán key vào code (dòng DUY NHẤT bạn sửa)

1. Mở file `eas.json`.
2. Tìm dòng:
   ```json
   "EXPO_PUBLIC_RC_ANDROID_KEY": "goog_REPLACE_WITH_KEY_FROM_REVENUECAT"
   ```
3. Thay `goog_REPLACE_WITH_KEY_FROM_REVENUECAT` bằng key `goog_...` copy ở Bước 3.7.
4. Lưu file. (Không cần sửa gì khác trong code.)

> Cách khác nếu không muốn key nằm trong file: dùng `eas env:create` để lưu biến bí mật trên EAS. Nhưng dán thẳng vào `eas.json` là đủ vì đây là public key.

---

## BƯỚC 6 — Thêm license testers (mua thử miễn phí)

1. Play Console → **Setup → License testing**.
2. Thêm địa chỉ Gmail bạn sẽ dùng để test trên điện thoại.
3. Các tài khoản này mua IAP sẽ **không bị tính tiền** (sandbox), nhưng luồng mua vẫn thật.

---

## BƯỚC 7 — Build thử + nghiệm thu trên điện thoại thật

RevenueCat/IAP **không chạy trong Expo Go** — bắt buộc bản build EAS trên máy Android thật, đăng nhập bằng tài khoản license-tester (Bước 6).

1. Build bản test:
   ```bash
   eas build -p android --profile preview
   ```
   Cài file `.apk` lên điện thoại (tài khoản license-tester).
2. Chạy checklist nghiệm thu (từ `revenuecat-launch.md` Task 7):
   - [ ] Paywall hiện **giá từ store** (`149.000₫`), không phải giá dev giả.
   - [ ] Mua Pro thành công (miễn phí vì license-tester) → mọi tính năng Pro mở khoá.
   - [ ] Tắt/mở lại app + bật chế độ máy bay → vẫn Pro (cache offline).
   - [ ] Gỡ cài → cài lại → bấm **Khôi phục** → Pro trở lại.
   - [ ] Đang mua mà bấm huỷ → không lỗi, không crash, vẫn chưa-Pro.
   - [ ] Đổi giá trên Play/RevenueCat → mở lại app → giá mới hiện ra, **không build lại**.
   - [ ] Support code trong Settings = ID người dùng RevenueCat, ổn định qua các lần mở.
3. Nếu bước nào fail → báo lại, mình sẽ debug (lỗi nằm ở adapter/config, **không phải UI** — UI không đổi từ Session 15).

---

## BƯỚC 8 — Nộp lên Google Play

1. Kiểm tra `app.json`: `expo.version` + `android.versionCode` (EAS `autoIncrement` tự tăng versionCode).
2. Build production:
   ```bash
   eas build -p android --profile production
   ```
3. Play Console: upload file `.aab` → điền **Store listing** (ảnh/nội dung theo launch guide Session 14, định vị GDM).
4. **Data Safety**: khai đúng — có **purchases** (mua hàng); **KHÔNG có cloud/thu thập dữ liệu đường huyết** (dữ liệu chỉ nằm trên máy). Không cần URL xoá tài khoản (app không có tài khoản).
5. Gắn URL **Privacy Policy** (đã có sẵn từ Session 14).
6. **(Tuỳ chọn) Soft-launch:** mời 10–15 mẹ vào Internal testing ~1 tuần trước khi công khai (bắt lỗi/copy sớm + pool phỏng vấn).
7. **Start rollout** lên production.

---

## Sau khi xong

- Commit cuối: `chore: production store submission`.
- **Apple/iOS:** đang **hoãn** (quyết định 2026-07-18 — Android trước). Khi mở iOS: mua Apple Developer $99/năm → non-consumable `sugar_pro_lifetime` trên App Store Connect → thêm iOS app vào RevenueCat (key `appl_...`) → thêm lại `EXPO_PUBLIC_RC_IOS_KEY` vào `eas.json` → bật Sign in with Apple → build iOS. Chi tiết trong `revenuecat-launch.md`.
- **Aptabase (analytics):** chưa làm — cần tạo tài khoản lấy app key trước; đến lúc đó làm Task 6 trong `revenuecat-launch.md`.

---

## Thứ tự phụ thuộc (làm đúng thứ tự)

```
Bước 1 (Play account) ─┐
                       ├─→ Bước 2 (tạo IAP) ─┐
Bước 3 (RevenueCat) ───┘                     │
        │                                     ├─→ Bước 5 (dán key) ─→ Bước 7 (test) ─→ Bước 8 (nộp)
        └─→ Bước 4 (service account) ─────────┘        ↑
                                          Bước 6 (license testers) ─┘
```
Bước 1, 3 có thể làm song song. Bước 4 chờ có cả Play lẫn RevenueCat. Bước 5 chỉ cần key ở Bước 3.7.
