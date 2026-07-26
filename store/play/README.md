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
| Cài **build #7 từ Internal testing** (không phải Expo Go / dev build) | UI phải đúng bản nộp Play |
| Đăng nhập bằng **license tester đã mua Pro** | ảnh 1 (PDF) chụp bản Free sẽ dính watermark — mất điểm bán |
| Settings → **Chế độ theo dõi → Thai kỳ** | tiêu đề store là "Sổ tiểu đường thai kỳ" → giao diện phải là Rose, khớp listing |
| Nhập **~3–4 tuần dữ liệu mẫu** | Trends cần đủ điểm mới ra đường; dưới 30 ngày biểu đồ vẽ từng điểm |
| Dữ liệu **bịa**, không dùng số thật của người nhà | ảnh này công khai vĩnh viễn trên store |
| Đa số chỉ số **trong ngưỡng**, chỉ 2–3 điểm cao | thấy được màu cảnh báo mà app không trông như dành cho ca bệnh nặng |
| Bật **Không làm phiền**, pin ≥ 80%, tắt đồng hồ báo thức | thanh trạng thái sạch, không lộ thông báo cá nhân |

### 6 ảnh

| # | Tên file | Màn | Đường đi | Trong khung phải thấy |
|---|---|---|---|---|
| 1 | `01-report-pdf.png` | Báo cáo PDF | Settings → Báo cáo → chọn khoảng → Xuất PDF → màn xem trước | Bảng chỉ số + tiêu đề báo cáo, **không có dòng watermark ở chân trang** |
| 2 | `02-log.png` | Log | Tab **Log**, đã điền sẵn 1 giá trị (vd `95`) | Ô nhập số to, thời gian + loại bữa đã tự điền — minh hoạ "ghi 2 chạm" |
| 3 | `03-reminders.png` | Nhắc đo | Settings → Nhắc đo (`/reminders`) | Danh sách khung giờ nhắc đã bật |
| 4 | `04-today.png` | Hôm nay | Tab **Hôm nay** | Tuần thai + các slot đo trong ngày (nền Rose) |
| 5 | `05-trends.png` | Trends | Tab **Trends**, chọn mốc 30 ngày | Đường biểu đồ có dữ liệu + dải ngưỡng |
| 6 | `06-share-zalo.png` | Chia sẻ | Từ màn báo cáo → nút Chia sẻ → share sheet Android | Zalo hiện trong share sheet (**cần cài Zalo trước**; không có thì chụp share sheet thường, đừng ghép giả) |

Chép ảnh về `store/play/screenshots/` theo đúng tên trên rồi upload — Play xếp theo thứ tự upload,
ảnh 1 là ảnh đại diện nên để báo cáo PDF lên đầu.

**Không** ghép chữ quảng cáo lên ảnh nếu nó hứa hẹn y tế ("kiểm soát đường huyết", "an toàn cho
thai kỳ"). Chữ mô tả tính năng thì được.
