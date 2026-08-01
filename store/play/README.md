# Đồ hoạ Play Store listing

Vật liệu cho §4 của `docs/plans/2026-07-26-session-23-buoc-8-production.md`.

| File | Kích thước | Trạng thái |
|---|---|---|
| `icon-512.png` | 512×512, PNG không alpha | ✅ sinh tự động |
| `feature-graphic-1024x500.png` | 1024×500, sRGB | ✅ sinh tự động |
| `screenshots/` | ≥2 ảnh dọc (nộp 6) | ⬜ phải chụp tay trên máy thật |

---

## 1. Sinh lại icon + nguồn feature graphic

```bash
node store/play/build-graphics.js
```

Đọc màu brand từ `src/ui/theme/colors.ts` (`evergreen.brand` = `#0FA36B`) và icon gốc
`assets/images/icon.png`. Sửa tagline/chip thì sửa phần HTML cuối script rồi chạy lại.

**Icon vì sao phải flatten:** icon gốc bo góc + góc trong suốt. Play cấm icon trong suốt và tự áp
mask bo góc, nên nộp bản trong suốt sẽ bị bo hai lần (viền đen ở góc). Script composite lên nền
brand → ô vuông đặc, Play tự bo.

## 2. Chụp feature graphic (cần trình duyệt vì có chữ)

```bash
.claude-tools/browser/run.sh launch
.claude-tools/browser/run.sh exec "
  await page.goto('file://\$PWD/store/play/.tmp/feature-graphic.html');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  await page.locator('#fg').screenshot({path:'store/play/.tmp/fg-2x.png'});
"
# Chrome chụp ở DPR 2 và ghi theo profile màn hình (P3) → hạ về 1024×500 VÀ ép sRGB:
sips -z 500 1024 --matchTo "/System/Library/ColorSync/Profiles/sRGB Profile.icc" \
  store/play/.tmp/fg-2x.png --out store/play/feature-graphic-1024x500.png
```

⚠️ **Bỏ bước `--matchTo` là màu sai:** không ép sRGB thì `#0E8F5E` ra `#418E63` — xanh xám, lệch
hẳn brand. Kiểm lại bằng cách xem pixel góc trái trên phải ≈ `#0e905f`.

---

## 3. Kịch bản chụp 6 screenshot

**Yêu cầu Play:** ảnh **dọc**, PNG/JPG, cạnh 320–3840px, tỉ lệ tối đa 2:1, tối thiểu 2 ảnh.
Chụp **cùng một máy** cho 6 ảnh để khung hình đồng bộ.

### Chuẩn bị trước khi chụp

| Việc | Vì sao |
|---|---|
| Chụp trên **Android**, KHÔNG phải iOS | listing là app Android; ảnh iOS (home indicator, status bar iOS) là mô tả sai app |
| Cài **build #7 từ Internal testing** (không phải Expo Go / dev build) | UI phải đúng bản nộp Play — và bản dev lộ khối `DEV ·` ở màn Nhắc đo (`__DEV__`, `app/reminders.tsx`) |
| Đăng nhập bằng **license tester đã mua Pro** | ảnh 1 (PDF) chụp bản Free sẽ dính watermark — mất điểm bán |
| Giao diện phải là **tiếng Việt** (Settings → Ngôn ngữ) | listing tiếng Việt mà ảnh tiếng Anh là lệch |
| **Khôi phục file dữ liệu mẫu** (mục 4 dưới) thay vì nhập tay | set-up một phát: 4 tuần dữ liệu + chế độ Thai kỳ + tiếng Việt + mmol/L + ngày dự sinh + nhắc đo |
| Bật **Không làm phiền**, pin ≥ 80%, tắt đồng hồ báo thức | thanh trạng thái sạch, không lộ thông báo cá nhân |

### 6 ảnh

| # | Tên file | Màn | Đường đi | Trong khung phải thấy |
|---|---|---|---|---|
| 1 | `01-report-pdf.png` | Báo cáo PDF | Settings → Báo cáo → PDF → 14 ngày → màn xem trước | Bảng chỉ số kín dòng, **không có dòng `Tạo bởi app Sugar` ở chân trang** |
| 2 | `02-today.png` | Hôm nay | Tab **Hôm nay** | Tuần thai + các slot đo trong ngày (nền Rose) |
| 3 | `03-log.png` | Log | Tab **Log**, đã điền sẵn 1 giá trị | Ô nhập số to, thời gian + loại bữa đã tự điền — **bữa phải hợp với giờ** (đừng để "Sáng" lúc 2h chiều) |
| 4 | `04-reminders.png` | Nhắc đo | Settings → Nhắc đo (`/reminders`) | 3 khung giờ nhắc + nhắc thông minh sau ăn; **không được thấy khối `DEV ·`** |
| 5 | `05-trends.png` | Trends | Tab **Trends**, chọn mốc 30 ngày | Đường biểu đồ liền có dữ liệu + dải ngưỡng |
| 6 | `06-history.png` | Lịch sử | Tab **Lịch sử** | Danh sách chỉ số, 1–2 dòng có badge CAO |

**Yêu cầu kỹ thuật:** máy 20:9 chụp ra 1080×2400 = **2.22:1**, vượt mức 2:1. Pad về đúng 2:1, không
méo và không mất nội dung:

```bash
sips --padToHeightWidth 2400 1200 --padColor FDF6FA <file>   # FDF6FA = nền Rose
```

---

## 4. Dữ liệu mẫu để dựng cảnh

```bash
node store/play/build-demo-backup.js     # → store/play/.tmp/sugar-demo-backup.json
```

96 chỉ số / 28 ngày, ~91% trong ngưỡng, 9 điểm cao; kèm sẵn settings (Thai kỳ, tiếng Việt, mmol/L,
ngày dự sinh = hôm nay + 70 ngày ⇒ "Tuần 30", 3 mốc nhắc đo). Chép sang máy → Settings → Sao lưu &
khôi phục → **Khôi phục**.

⚠️ Khôi phục **xoá sạch** dữ liệu đang có trên máy. Bấm **Sao lưu** giữ dữ liệu thật trước đã, chụp
xong thì khôi phục ngược lại.

Dữ liệu là **bịa** — không bao giờ dùng số thật của người nhà, ảnh này công khai vĩnh viễn trên store.

Chép ảnh về `store/play/screenshots/` theo đúng tên trên rồi upload — Play xếp theo thứ tự upload,
ảnh 1 là ảnh đại diện nên để báo cáo PDF lên đầu.

**Không** ghép chữ quảng cáo lên ảnh nếu nó hứa hẹn y tế ("kiểm soát đường huyết", "an toàn cho
thai kỳ"). Chữ mô tả tính năng thì được.
