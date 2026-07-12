# Session 14 — Hướng dẫn đưa Sugar lên Google Play (cho người lần đầu)

> Viết 12/07/2026. Chỉ nói về **Android / Google Play**; phần Apple bổ sung ở Session 23.
> Phần code (eas.json, app.json, privacy page, About URL) **đã làm xong** trong Session 14.
> ⚠️ **Chiến lược cập nhật 2026-07-12:** thực sự *submit lên store là Session 23 (cuối cùng)*, sau khi build xong toàn bộ app. File này là tài liệu tham khảo cho lúc đó — trừ mục **Admin track** (cuối file) nên làm NGAY vì nó chặn Session 15.
> Các bước dưới là việc **bạn tự làm bằng tay** khi tới lúc phát hành.

Bundle ID / package của app: **`io.minhthang.sugar`** (đã ghi vào `app.json`, đừng đổi).

---

## Bức tranh tổng thể (đọc 1 phút)

Có 3 nhóm việc, làm theo thứ tự:

1. **Chuẩn bị tài khoản** — Play Console ($25), tài khoản Expo (miễn phí).
2. **Build file cài đặt** — dùng EAS build ra file `.aab` để nộp Play.
3. **Tạo listing + nộp** — điền thông tin, upload `.aab`, bấm gửi duyệt.

Song song, có **Admin track** (mục cuối) nên bắt đầu NGAY vì nó chặn Session 15.

---

## BƯỚC 0 — Cài công cụ (một lần)

Trong terminal, tại thư mục dự án:

```bash
# Cài EAS CLI toàn cục
npm install -g eas-cli

# Đăng nhập (tạo tài khoản miễn phí tại https://expo.dev nếu chưa có)
eas login

# Liên kết dự án với Expo — lệnh này TỰ ĐIỀN extra.eas.projectId vào app.json
eas init
```

> Sau `eas init`, mở `app.json` kiểm tra có mục `extra.eas.projectId` là "…-…-…". Commit thay đổi đó.

---

## BƯỚC 1 — Mở tài khoản Google Play Console ($25)

1. Vào <https://play.google.com/console> → đăng nhập tài khoản Google.
2. Chọn loại tài khoản **Cá nhân (Personal)** (đơn giản nhất cho bạn).
3. Trả **phí $25 một lần** bằng thẻ **Vietcombank ECard** (Visa debit) — nhớ bật "thanh toán trực tuyến quốc tế" trong app VCB Digibank + nạp đủ ~700k trước. Đăng ký **đứng tên chính bạn** (không nhờ ai).
4. Xác minh danh tính: Google yêu cầu **CMND/CCCD + địa chỉ**. Có thể mất **vài ngày** để duyệt → làm sớm.

> ⚠️ Tài khoản cá nhân tạo **sau 13/11/2023** bị bắt buộc **closed testing với ≥12 người test trong 14 ngày** trước khi được lên production. Nếu tài khoản của bạn mới, tính thêm ~2 tuần cho khâu này (mời 12 người cài bản test). Kiểm tra thông báo trong Play Console.

---

## BƯỚC 2 — Build file `.aab` bằng EAS

```bash
# Build bản production (file .aab để nộp Play). Chạy trên cloud, ~10–20 phút.
eas build --platform android --profile production
```

- Lần đầu EAS hỏi **tạo keystore (chữ ký) tự động?** → chọn **Yes**. EAS giữ hộ chữ ký này; **đừng làm mất** (mọi bản cập nhật sau phải ký cùng chữ ký).
- Build xong, EAS cho **link tải file `.aab`**. Tải về máy.

> Muốn test nhanh trên điện thoại trước khi nộp: `eas build -p android --profile preview` ra file `.apk` cài tay được.

---

## BƯỚC 3 — Đưa trang Privacy Policy lên mạng (GitHub Pages, miễn phí)

Google **bắt buộc** có link privacy policy công khai. File đã viết sẵn: `docs/privacy.html`.

**Lưu ý quan trọng:** nếu bật Pages từ thư mục `/docs` của repo `sugar`, các file PLAN/PRD trong `/docs` cũng bị **công khai**. Chọn 1 trong 2 cách:

**Cách A — Nhánh `gh-pages` riêng (khuyến nghị, không lộ file nội bộ):**
```bash
# Tạo nhánh trống chỉ chứa trang privacy
git checkout --orphan gh-pages
git rm -rf .
cp docs/privacy.html index.html   # đổi tên thành index.html cho gọn URL
git add index.html
git commit -m "chore: privacy policy page"
git push origin gh-pages
git checkout feature/session-14   # quay lại nhánh làm việc
```
Rồi vào GitHub repo → **Settings → Pages** → Source = nhánh `gh-pages`, thư mục `/root` → Save.
URL sẽ là: `https://thang-39.github.io/sugar/`
→ **Nếu dùng cách này, sửa lại `PRIVACY_URL` trong `app/about.tsx`** thành URL này (bỏ `/privacy.html`).

**Cách B — Chấp nhận công khai `/docs`:** Settings → Pages → Source = nhánh `main`, thư mục `/docs`.
URL: `https://thang-39.github.io/sugar/privacy.html` (đúng URL đã gắn sẵn trong About — không phải sửa gì).

> Sau khi bật, đợi 1–2 phút rồi mở URL trên trình duyệt kiểm tra trang hiện đúng.

---

## BƯỚC 4 — Chụp 6 screenshot (trên điện thoại thật hoặc emulator)

Play cần tối thiểu 2, nên chụp 6 cho đẹp. Yêu cầu: ảnh dọc, JPG/PNG, cạnh 320–3840px.
Chụp đúng các màn này (theo growth plan §3):

1. **Báo cáo bác sĩ (PDF)** — điểm bán chính "Thay tờ giấy bệnh viện phát"
2. **Màn Log** — ghi chỉ số, minh họa "Ghi xong trong 5 giây"
3. **Màn Nhắc đo (Reminders)**
4. **Màn Hôm nay** với các slot (theme hồng — chế độ thai kỳ)
5. **Màn Trends** (biểu đồ)
6. **Chia sẻ báo cáo qua Zalo**

> Mẹo: mở app, vào từng màn, chụp màn hình điện thoại như bình thường. Nếu muốn có chữ quảng cáo trên ảnh thì dùng Canva ghép sau (không bắt buộc).

---

## BƯỚC 5 — Tạo app + điền Store Listing trong Play Console

Trong Play Console → **Create app** → điền:
- App name: **Sugar** · Ngôn ngữ mặc định: **Tiếng Việt** · Loại: **App** · Miễn phí.

Rồi vào **Main store listing**, dán các nội dung soạn sẵn dưới đây:

**Tiêu đề app (≤30 ký tự):**
```
Sugar – Sổ tiểu đường thai kỳ
```

**Mô tả ngắn (≤80 ký tự):**
```
Ghi đường huyết 2 chạm, nhắc đo sau bữa ăn, xuất báo cáo đưa bác sĩ
```

**Mô tả đầy đủ (dán vào "Full description"):**
```
Sugar giúp mẹ bầu và người theo dõi đường huyết ghi lại chỉ số nhanh gọn, đúng lúc, và xuất báo cáo gọn gàng để đưa bác sĩ.

• Ghi chỉ số chỉ với 2 chạm — thời gian, loại bữa ăn tự điền sẵn.
• Nhắc đo thông minh sau bữa ăn: ghi chỉ số trước ăn, app tự nhắc đo lại sau 1 giờ / 2 giờ theo chỉ định bác sĩ.
• Màn "Hôm nay" hiển thị lịch đo trong ngày theo nhịp của mẹ.
• Xuất báo cáo PDF/CSV gọn gàng để gửi bác sĩ qua Zalo hay email.
• Biểu đồ xu hướng dễ nhìn.
• Chữ to, thao tác đơn giản — hợp cả người lớn tuổi đo tại nhà.
• Toàn bộ dữ liệu lưu trên máy của bạn — không thu thập, không gửi đi đâu.

Sugar là công cụ ghi chép và theo dõi. Ứng dụng không chẩn đoán, không điều trị và không thay thế tư vấn của bác sĩ.
```

> ⚠️ **Không** dùng từ "chẩn đoán / điều trị / chữa" ở bất kỳ đâu — Google có thể từ chối app y tế có tuyên bố như vậy.

**Từ khóa** (Play không có ô keyword riêng — nhét tự nhiên vào mô tả; danh sách để tham khảo):
`tiểu đường thai kỳ, đường huyết, mẹ bầu, GDM, sổ theo dõi đường huyết, đo đường huyết, glucose, thai kỳ`

**Privacy policy URL:** dán URL ở Bước 3.

**Đồ họa bắt buộc khác:**
- App icon 512×512 (đã có trong `assets/images/icon.png` — export cỡ 512 nếu cần).
- Feature graphic 1024×500 (ảnh banner — làm nhanh bằng Canva).
- Screenshots từ Bước 4.

---

## BƯỚC 6 — Điền các form khai báo (Play Console → App content)

**a) Data Safety (An toàn dữ liệu):**
- "Does your app collect or share any user data?" → **No**.
- Lý do: mọi dữ liệu lưu cục bộ; thông báo là local; không có server. → Không cần khai mục dữ liệu nào.

**b) Health apps declaration (nếu Play hỏi):**
- App **không** kết nối Google Fit / Health Connect.
- Mô tả mục đích: "Ghi chép và theo dõi chỉ số đường huyết cá nhân; không chẩn đoán/điều trị."

**c) Content rating:** làm bảng hỏi → app sẽ ra mức **Everyone / 3+**.

**d) Target audience:** chọn nhóm **người lớn (18+)**, không nhắm trẻ em.

**e) Ads:** app **không** có quảng cáo → chọn No (Session 19 mới cân nhắc, và đang mặc định SKIP).

---

## BƯỚC 7 — Upload `.aab` và gửi duyệt

1. Play Console → **Production** (hoặc **Closed testing** trước nếu tài khoản bị bắt buộc — xem Bước 1).
2. **Create new release** → upload file `.aab` từ Bước 2.
3. Điền "Release notes" (vi): `Phiên bản đầu tiên.`
4. **Review release** → sửa hết cảnh báo đỏ nếu có → **Start rollout to Production**.
5. Google duyệt: thường **vài giờ đến vài ngày**. Có email khi được duyệt.

> Mỗi lần nộp bản mới: tăng versionCode (EAS `autoIncrement` tự lo vì `appVersionSource: "remote"`) rồi build lại + upload.

---

## ADMIN TRACK — bắt đầu NGAY (gate cho Session 23, KHÔNG còn chặn Session 15)

> Cập nhật 2026-07-12: Session 15 đã đổi sang dùng **dev adapter** (paywall chạy được không cần tài khoản). Các bước dưới giờ chỉ cần cho **Session 23** (wiring RevenueCat thật + phát hành). Cứ làm song song, không phải chờ.

Các bước này mất **vài ngày–vài tuần** để duyệt, làm song song đừng chờ:

1. **Play Console → Payments profile / Merchant:** thiết lập hồ sơ thanh toán để bán in-app (Session 15 cần). VN hỗ trợ, payout USD/EUR.
2. **RevenueCat:** tạo tài khoản tại <https://www.revenuecat.com> → tạo project → thêm Android app (bundle `io.minhthang.sugar`). Free tới ~64tr VND/tháng doanh thu.
3. **(Tùy chọn) Soft-launch:** mời 10–15 mẹ vào internal testing ~1 tuần trước khi public — vừa test vừa gom phản hồi.

Chi tiết đầy đủ xem "Admin track" trong `PLAN-2.md`.

---

## Checklist nhanh

- [ ] BƯỚC 0: `eas-cli` cài, `eas login`, `eas init` (projectId vào app.json)
- [ ] BƯỚC 1: Tài khoản Play Console ($25) đã duyệt
- [ ] BƯỚC 2: Build `.aab` thành công
- [ ] BƯỚC 3: Privacy page live + URL đúng trong About
- [ ] BƯỚC 4: 6 screenshots
- [ ] BƯỚC 5: Store listing điền xong (tiêu đề/mô tả/icon/feature graphic)
- [ ] BƯỚC 6: Data Safety = No, các form khai xong
- [ ] BƯỚC 7: Upload `.aab` + gửi duyệt
- [ ] ADMIN: Merchant profile + RevenueCat project (cho Session 23 — wiring IAP thật)
