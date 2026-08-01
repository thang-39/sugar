# Session 23 — Bước 8: promote lên Production (2026-07-26)

Bước 7 đã đóng — mọi mục acceptance pass trên máy thật với adapter RevenueCat thật, kết quả ở
`docs/plans/2026-07-25-session-23-buoc-7-acceptance.md`. Tài liệu này là phần còn lại của Session 23:
**khai báo cho đủ** rồi **promote**, không viết thêm code.

Các bước tay chi tiết hơn (tạo app, IAP, license tester): `2026-07-18-session-23-admin-handoff.md`.

---

## 0. Artifact: build **#8** — #7 đã bị loại (01/08)

> **Cập nhật 01/08.** Mục này ban đầu chốt "dùng #7, không build lại". **Không còn đúng.**
> Lúc dựng cảnh chụp screenshot, phát hiện **Khôi phục không chọn được file backup** trên chính
> build #7: picker mở với đúng một filter `application/json`, mà Android gán
> `application/octet-stream` cho file khi người dùng lưu nó vào máy từ share sheet → SAF làm mờ
> chính file app vừa xuất ra. Kiểm chứng: cùng file đó để trên Google Drive thì chọn được, để
> trong Downloads thì không.
> Sửa: `src/data/backup/import-backup.ts` bỏ lọc MIME (`parseBackup` mới là cửa kiểm tra thật, và
> đã có alert "file không hợp lệ" cho file lạ) + test hồi quy `src/data/backup/__tests__/`.
> Vì sao không hoãn: mô tả store quảng cáo thẳng tính năng sao lưu, app **không có `expo-updates`**
> nên vá sau vẫn tốn nguyên một vòng build + duyệt, mà lúc đó đã lỡ phát hành bản gãy.
> **Mọi chỗ ghi "#7 / versionCode 7" bên dưới đọc thành "#8 / versionCode 8".**
> `eas.json` để `appVersionSource: remote` + `autoIncrement` nên versionCode tự lên 8.
> Ghi chú cũ giữ lại bên dưới để biết #7 từ đâu ra:

**Build #9 — đã xong 01/08, đây là bản nộp Play:**

| Build | versionCode | Commit | Tình trạng |
|---|---|---|---|
| **#9 ← nộp bản này** | 9 | `816b885` (fix locale) | finished, 01/08 |
| #8 | 8 | `864d1b0` (fix Khôi phục) | thay bằng #9 — thiếu fix locale |
| #7 | 7 | `1dc26e1` | loại — Khôi phục không chọn được file lưu trong máy |

URL bản #9: `https://expo.dev/artifacts/eas/CQ4-_tc5lf4cZMskmVBShPIN_xYmdTMRUdBIUlLxFps.aab`
Trang build: `https://expo.dev/accounts/minhthang_dunia/projects/sugar/builds/5235f9b7-b48d-4156-9a1b-d334120d9a56`

**Vì sao có #9:** listing đổi sang mặc định **en-US** (§4), mà app khi đó luôn khởi động bằng
tiếng Việt — `src/i18n/index.ts` đặt cứng `lng: 'vi'` và không chỗ nào đọc locale máy, dù
`expo-localization` đã cài sẵn. Tệ hơn, nút **Skip** trong onboarding ghi đè `preferredLanguage`
thành Vietnamese. Người tải từ listing tiếng Anh sẽ mở ra một app tiếng Việt.
Sửa ở `816b885`: gieo ngôn ngữ theo máy **một lần** lúc cài mới, khoá bằng `SettingsRepository.has()`
(vì `get()` trả default khi thiếu row nên không phân biệt được "đã chọn vi" với "chưa chọn");
lựa chọn đã lưu không bao giờ bị suy diễn lại. Skip không đụng ngôn ngữ nữa.

**Smoke cho #9** (upload lên Internal testing trước, cài từ Play):
- [ ] **Máy để tiếng Anh, cài mới → app mở ra tiếng Anh.** ← fix của #9
- [ ] Onboarding → bấm **Skip** → vẫn tiếng Anh (trước đây rơi về tiếng Việt)
- [ ] Đổi Settings → Language → VI → thoát app → mở lại → **vẫn VI** (lựa chọn người dùng thắng máy)
- [ ] **Sao lưu → lưu file vào máy → Khôi phục → chọn được đúng file đó.** ← fix của #8
- [ ] Khôi phục `sugar-demo-backup.json` → báo 96 chỉ số, Rose + Tuần 30, nhắc đo nhãn tiếng Anh
- [ ] Mở app → Pro vẫn nhận đúng (Settings → hàng "Sugar Pro" ghi đã mở khoá)
- [ ] Paywall hiện giá **149.000₫** lấy từ store
- [ ] Bằng account **chưa mua**: paywall → "Khôi phục giao dịch" → ra alert (không im lặng)
- [ ] Play Console → release details ghi **versionCode 9**

Delta #7 → #9 chỉ gồm: một dòng lọc MIME trong `import-backup.ts`, phần chọn ngôn ngữ theo máy,
và test. Đường mua/persist/gate không đổi, nên không cần chạy lại cả checklist Bước 7.

### (cũ) Artifact: dùng build #7 — KHÔNG build lại

`eas build:list` (26/07):

| Build | versionCode | Commit | Tình trạng |
|---|---|---|---|
| **#7 ← dùng bản này** | 7 | `1dc26e1` = HEAD | **đã có** `ff00523` (fix Restore im lặng) |
| #6 | 6 | `338f86e` | bản đã nghiệm thu trên máy — thiếu fix Restore |
| #5 | 5 | `00afa78` | cũ |

URL bản #7: `https://expo.dev/artifacts/eas/tJWrHRu6OtRhdlGY74QlGyCrwoWQe9omi0Vkeh3fvLA.aab`

Doc nghiệm thu yêu cầu "bản nộp Play phải build từ `ff00523` trở đi" — **build #7 thoả**, nên
không cần vòng build EAS nào nữa. Chỉ lưu ý: bản đã test tay là **#6**, nên #7 có một delta chưa
sờ tới trên máy (`app/paywall.tsx` thêm `catch` + 2 chuỗi i18n + 1 test hook).

**Smoke 2 phút cho #7** (upload #7 lên Internal testing trước, cài từ Play):
- [ ] Mở app → Pro vẫn nhận đúng (Settings → hàng "Sugar Pro" ghi đã mở khoá).
- [ ] Paywall hiện giá **149.000₫** lấy từ store.
- [ ] Bằng account **chưa mua**: paywall → "Khôi phục giao dịch" → ra alert (không im lặng).
- [ ] Play Console → release details ghi **versionCode 7** (chắc chắn đang test đúng bản).

Không cần chạy lại cả checklist Bước 7 — đường code mua/persist/gate không đổi giữa #6 và #7.

---

## 1. Đẩy privacy policy TRƯỚC khi rollout ⚠️

Bản đang live (`https://thang-39.github.io/sugar/privacy.html`) viết *"does not collect, transmit
to any server, or share any of your personal or health data"* — **đã sai** kể từ khi
`react-native-purchases` vào bản build: SDK RevenueCat gửi lịch sử mua + mã ẩn danh + IP lên máy
chủ của họ. Google đối chiếu Data Safety với privacy policy, nên khai "có thu thập purchases" mà
policy nói "không thu thập gì" là tự tạo mâu thuẫn.

**Đã sửa trong repo** (`docs/privacy.html`, cả EN và VI):
- Mục 1 thu hẹp đúng phạm vi: **dữ liệu sức khỏe** không rời máy, không có tài khoản, không có máy chủ.
- Mục 4 nói thêm tệp **sao lưu** (S17.5), không chỉ PDF/CSV.
- **Mục 5 mới — Giao dịch mua:** Google Play thu tiền; RevenueCat nhận lịch sử mua + mã ẩn danh
  (chính là mã hỗ trợ trong Giới thiệu) + dữ liệu kỹ thuật/IP; **không** nhận tên/email/đường huyết;
  mã hoá khi truyền; **cách xin xoá** = gửi mã hỗ trợ qua email (kèm ghi chú Google giữ bản ghi riêng).
- **Mục 6 mới — Số liệu sử dụng:** nói thẳng là công tắc "Chia sẻ dữ liệu ẩn danh" hiện **không gửi gì**
  vì chưa nối dịch vụ phân tích nào.
- Mục 7 quyền: thêm quyền thanh toán của Play. Ngày cập nhật → 26/07/2026.

**Việc phải làm:** ✅ **XONG 26/07** — bản live đã kiểm chứng: "Cập nhật lần cuối: 26/07/2026",
có mục 5 (RevenueCat), email `trantruongminhthang@gmail.com`; `main` đã đồng bộ với `origin/main`.
- [x] `git push` lên `main` — Pages phục vụ từ `main /docs`, chưa push thì URL vẫn trả bản cũ.
- [x] Đợi 1–2 phút → mở URL, xác nhận thấy "Cập nhật lần cuối: 26/07/2026" và có mục 5.
- [x] Policy dùng **`trantruongminhthang@gmail.com`** — đã live đúng.
- [ ] **Ô contact của store listing** phải điền cùng email đó (làm ở mục 4) —
      chốt lại 26/07: app cá nhân thì dùng hộp thư cá nhân, không dùng domain công
      ty (đổi việc là mất hộp thư, mà đây là địa chỉ nhận yêu cầu xoá dữ liệu ở mục 5 của policy).
      Ghi chú cũ trong doc Session 22 nói là `thang.tran1@mesoneer.io` đã được đánh dấu lạc hậu.

---

## 2. Data Safety — bảng khai chính xác

> Session 14 ghi "Data Safety = **No**". **Không còn đúng** — lúc đó app chưa có RevenueCat.
> Bảng dưới đối chiếu theo tài liệu chính thức của RevenueCat cho form này.

**Câu mở đầu:** "Does your app collect or share any user data?" → **Yes**.

| Trường | Trả lời |
|---|---|
| Data type | **Financial info → Purchase history** |
| Collected / Shared | **Collected** ☑ · Shared ☐ (RevenueCat là service provider xử lý thay ta → không tính "shared") |
| Processed ephemerally? | **No** |
| Required or optional | **Required** — người dùng không tắt được (mua hàng thì bắt buộc có) |
| Purposes | **App functionality** + **Analytics** |
| Encrypted in transit? | **Yes** |
| Way to request deletion? | **Yes** — email + mã hỗ trợ (đúng mục 5 của policy) |

**KHÔNG khai** các loại sau, kèm lý do (để sau này bị hỏi còn nhớ):
- **Health and fitness** — Data Safety chỉ khai dữ liệu **rời khỏi thiết bị**. Chỉ số đường huyết
  nằm trong SQLite trên máy, chỉ đi ra khi **người dùng tự bấm xuất/chia sẻ** (Play miễn trừ
  "user-initiated transfer"). Đây là lý do khai "No" cho nhóm này vẫn đúng dù app là app sức khỏe.
- **Personal info** — không có tên/email; không dùng RevenueCat customer attributes.
- **Device or other IDs** — RevenueCat chỉ yêu cầu khai khi dùng tích hợp **advertising ID**; ta
  không dùng, app cũng không có `AD_ID`. Mã ẩn danh của RC không phải device identifier.
- **App activity / Crash logs / Location / Messages / Photos / Contacts** — app không có SDK nào gửi.

**Analytics ẩn danh — tạm thời chưa khai.** `src/data/analytics.ts` vẫn là **no-op** (chỉ
`console.log` khi `__DEV__`), chưa có `@aptabase`, và `rg` xác nhận app **không có bất kỳ lệnh
network nào** ngoài SDK RevenueCat. Khai "có thu thập analytics" khi thực tế không gửi gì là sai
theo hướng ngược lại và làm xấu thẻ Data safety trên store — mà đây lại đang là điểm bán.
→ **Ngày nối Aptabase thật:** mở lại form, thêm **App activity → App interactions** (Collected,
*Optional* vì có công tắc opt-out, purpose Analytics), và sửa mục 6 của privacy policy. **Sửa Data
Safety không cần release mới** — không phải chờ build.

---

## 3. Các form còn lại trong App content

| Form | Trả lời |
|---|---|
| Privacy policy | URL `https://thang-39.github.io/sugar/privacy.html` (sau khi push, mục 1) |
| App access | Toàn bộ tính năng dùng được **không cần đăng nhập** → chọn "All functionality is available without special access" |
| Ads | **No** — app không có quảng cáo (Session 19 đang SKIP) |
| Content rating | Làm bảng hỏi → ra **Everyone / 3+**. App là công cụ ghi chép, **không** đưa lời khuyên y tế |
| Target audience | **18+**, không nhắm trẻ em (chọn nhóm dưới 18 sẽ kéo theo chính sách Families) |
| Health apps declaration | Nếu Play hỏi: **không** kết nối Health Connect / Google Fit; mục đích "ghi chép và theo dõi chỉ số đường huyết cá nhân, không chẩn đoán/điều trị" |
| Financial features | **No** — mua trong ứng dụng không phải "financial product" |
| Government apps / News | **No** |
| Advertising ID | **Không** dùng |
| Category | **Health & Fitness** (theo PRD: personal wellness, không chọn Medical để tránh vòng duyệt ngặt hơn) |
| Data safety | Bảng ở mục 2 |

---

## 4. Store listing — nội dung dán

> **Chốt 01/08: ngôn ngữ mặc định của listing là `en-US`.** Bản `vi-VN` thêm vào sau như một
> localization, không phải bản chính. Kéo theo: 6–7 ảnh chụp phải là **giao diện tiếng Anh**, và
> app phải mở ra bằng tiếng Anh trên máy tiếng Anh — đó là lý do có build #9 (xem §0b).

### 4a. Bản en-US (mặc định — dán bản này trước)

Tiêu đề (28/30 ký tự):

```
Sugar – Gestational Diabetes
```

Mô tả ngắn (69/80 ký tự):

```
Log blood sugar in 2 taps, after-meal reminders, doctor-ready reports
```

Mô tả đầy đủ:

```
Sugar helps you log blood sugar quickly, at the right moment, and hand your doctor a clean report.

• Log a reading in 2 taps — the time and meal are filled in for you.
• Smart after-meal reminders: log a before-meal reading and Sugar reminds you to measure again 1 or 2 hours later, following your doctor's protocol.
• The Today screen lays out the day's measurements around your own rhythm.
• Export tidy PDF or CSV reports to send your doctor by email or chat.
• Clear trend charts.
• Large text and simple steps — it works for older people measuring at home too.
• Back up to a file to keep yourself or move to a new phone — your data stays yours.
• Your blood sugar readings stay on your phone: no account, and no health data is sent to any server.

Sugar Pro (one-time purchase, no subscription) adds: unlimited PDF reports with no watermark, CSV export, and per-meal analysis.

Sugar is a logging and tracking tool. It does not diagnose, does not treat, and is not a substitute for your doctor's advice.
```

### 4b. Bản vi-VN (thêm sau, dùng nguyên văn bản Session 14 dưới đây)

Tiêu đề + mô tả ngắn giữ nguyên bản Session 14:

```
Sugar – Sổ tiểu đường thai kỳ
```
```
Ghi đường huyết 2 chạm, nhắc đo sau bữa ăn, xuất báo cáo đưa bác sĩ
```

**Mô tả đầy đủ — dùng bản dưới** (đã sửa 2 chỗ so với Session 14: dòng quyền riêng tư nói chính
xác hơn, và thêm dòng Pro cho minh bạch chuyện mua trong ứng dụng):

```
Sugar giúp mẹ bầu và người theo dõi đường huyết ghi lại chỉ số nhanh gọn, đúng lúc, và xuất báo cáo gọn gàng để đưa bác sĩ.

• Ghi chỉ số chỉ với 2 chạm — thời gian, loại bữa ăn tự điền sẵn.
• Nhắc đo thông minh sau bữa ăn: ghi chỉ số trước ăn, app tự nhắc đo lại sau 1 giờ / 2 giờ theo chỉ định bác sĩ.
• Màn "Hôm nay" hiển thị lịch đo trong ngày theo nhịp của mẹ.
• Xuất báo cáo PDF/CSV gọn gàng để gửi bác sĩ qua Zalo hay email.
• Biểu đồ xu hướng dễ nhìn.
• Chữ to, thao tác đơn giản — hợp cả người lớn tuổi đo tại nhà.
• Sao lưu ra tệp để tự giữ hoặc chuyển sang máy mới — dữ liệu luôn là của bạn.
• Chỉ số đường huyết của bạn chỉ nằm trên máy: app không có tài khoản, không gửi dữ liệu sức khỏe lên máy chủ nào.

Sugar Pro (mua một lần, không thuê tháng) mở thêm: báo cáo PDF không giới hạn và không watermark, xuất CSV, và phân tích "Theo bữa".

Sugar là công cụ ghi chép và theo dõi. Ứng dụng không chẩn đoán, không điều trị và không thay thế tư vấn của bác sĩ.
```

> ⚠️ Không dùng từ "chẩn đoán / điều trị / chữa" như một tuyên bố về app.
> ⚠️ Không ghi giá cứng trong mô tả, không dựng giá gạch ngang giả — giá luôn để store tự hiện.

**Đồ hoạ bắt buộc** — vật liệu + hướng dẫn ở `store/play/README.md`:
- [x] App icon 512×512 → `store/play/icon-512.png`. **Không dùng thẳng `assets/images/icon.png`**:
      bản đó 1024px và góc trong suốt, mà Play cấm icon trong suốt + tự áp mask bo góc (nộp bản
      trong suốt sẽ bị bo hai lần). File mới đã composite lên nền brand `#0FA36B`, không alpha.
- [x] Feature graphic 1024×500 → `store/play/feature-graphic-1024x500.png` (sRGB, đã kiểm màu).
- [ ] Screenshot dọc — Play cần tối thiểu 2, chuẩn bị 7: Báo cáo PDF · Hôm nay · Log · Nhắc đo ·
      Trends · Lịch sử · Settings (chốt 01/08, bỏ ảnh chia sẻ Zalo — không cần cài Zalo chỉ để chụp).
      **Giao diện phải là tiếng Anh** (listing mặc định en-US).
      **Lượt chụp thứ hai (01/08, 15:54–15:55, Android bản production, 1080×2340) — gần đạt.**
      Đạt: Android production (hết khối `DEV ·`), Rose, ảnh Settings ghi "Sugar Pro — Unlocked ✓"
      (⇒ PDF không watermark), 96 chỉ số nên bảng PDF kín 7 dòng, giờ khớp bữa ở màn Log.
      Còn phải chụp lại sau khi cài #9:
      1. **Nhắc đo** — nhãn còn tiếng Việt ("Đo lúc đói"…) giữa màn tiếng Anh; đã sửa bằng
         `build-demo-backup.js --lang en` (mặc định en) → nhãn thành `Fasting check / After lunch / Before bed`.
      2. **Báo cáo** — nút "Send feedback →" bị cắt đôi ở mép trên, phải cuộn lên đầu màn.
      3. **Cả bộ** — status bar còn icon thông báo và **pin 16%**: bật Không làm phiền, xoá thông báo, sạc ≥80%.
      4. Tỉ lệ 2340/1080 = **2.1666 > 2:1** → tôi pad về 1170×2340 sau khi nhận ảnh cuối.
      **Kịch bản chụp chi tiết — §3 của `store/play/README.md`.**
      **Bộ ảnh 01/08 đã bị loại, phải chụp lại.** Lý do, để không lặp lại:
      1. chụp trên **iPhone** (1242×2688) chứ không phải build #7 Android;
      2. là **bản dev** — ảnh Nhắc đo lộ khối `DEV · scheduled (3) / manual:m178…` (gate `__DEV__`,
         `app/reminders.tsx:218`), bản production không có;
      3. giao diện **tiếng Anh** trong khi listing tiếng Việt (Settings → Ngôn ngữ);
      4. tỉ lệ 2.16:1 > mức 2:1;
      5. chỉ 10 chỉ số / 2 ngày → bảng PDF 2 dòng, Trends nguệch ngoạc, in-range 60–70%.
      Ảnh cũ để tạm ở `store/play/.tmp/ios-cu/`. Đạt sẵn: Rose đúng, status bar sạch, PDF không watermark.
- [x] Dữ liệu mẫu để dựng cảnh: `node store/play/build-demo-backup.js` → 96 chỉ số / 28 ngày,
      91% trong ngưỡng, kèm settings Thai kỳ + tiếng Việt + mmol/L + ngày dự sinh + 3 mốc nhắc đo.
      Khôi phục trên máy thay cho nhập tay ~100 lần (đã kiểm bằng `parseBackup`/`applyBackup` thật:
      restored 96, skipped 0). **Sao lưu dữ liệu thật trước khi khôi phục — restore xoá sạch máy.**
- [ ] Email liên hệ = `trantruongminhthang@gmail.com` (đúng email trong privacy policy, mục 1)

---

## 5. Promote → Production

1. [ ] Play Console → **Testing → Internal testing** → release **versionCode 7**.
2. [ ] **Promote release → Production**.
3. [ ] Release notes (vi): `Phiên bản đầu tiên.`
4. [ ] **Countries/regions**: bật **Việt Nam** (thêm nước khác nếu muốn — app chỉ có vi/en).
5. [ ] **Review release** → sửa hết cảnh báo đỏ. Cảnh báo hay gặp: thiếu Data safety, thiếu content
       rating, thiếu screenshot, chưa chọn country.
6. [ ] Rollout **100%** — app chưa có người dùng nào nên staged rollout không mua thêm được sự an toàn nào.
7. [ ] **Start rollout to Production.** Google duyệt: vài giờ đến vài ngày, có email khi xong.

---

## 6. Sau khi được duyệt

- [ ] Mở link store công khai bằng máy khác → listing, ảnh, badge "Mua hàng trong ứng dụng" hiện đúng.
- [ ] **Một lượt mua thật** bằng account **không** phải license tester (mất 149.000₫ thật) — đây là
      lần duy nhất xác nhận billing production, vì license tester luôn là sandbox. Xong thì refund
      trong Play Console. **Refund từ RevenueCat trước** rồi để nó đẩy sang Play (bẫy Bước 7).
- [ ] RC Dashboard → giao dịch đó hiện ở **production** (không phải sandbox) → tắt toggle Sandbox data vẫn thấy.
- [ ] Commit cuối: `chore: production store submission`.

**Còn nợ, không chặn rollout:** Aptabase (Task 6 trong `revenuecat-launch.md`) · iOS/Apple (hoãn,
quyết định 18/07) · `expo-updates` chưa có nên mọi sửa JS đều phải build lại.
