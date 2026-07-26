# Session 23 — Bước 8: promote lên Production (2026-07-26)

Bước 7 đã đóng — mọi mục acceptance pass trên máy thật với adapter RevenueCat thật, kết quả ở
`docs/plans/2026-07-25-session-23-buoc-7-acceptance.md`. Tài liệu này là phần còn lại của Session 23:
**khai báo cho đủ** rồi **promote**, không viết thêm code.

Các bước tay chi tiết hơn (tạo app, IAP, license tester): `2026-07-18-session-23-admin-handoff.md`.

---

## 0. Artifact: dùng build #7 — KHÔNG build lại

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

**Việc phải làm:**
- [ ] `git push` lên `main` — Pages phục vụ từ `main /docs`, chưa push thì URL vẫn trả bản cũ.
- [ ] Đợi 1–2 phút → mở URL, xác nhận thấy "Cập nhật lần cuối: 26/07/2026" và có mục 5.
- [ ] Email liên hệ trong policy là `trantruongminhthang@gmail.com` (doc Session 22 tưởng là
      `thang.tran1@mesoneer.io` — file thực tế là gmail). Điền **cùng** email đó vào ô contact của
      store listing cho khớp; muốn đổi thì đổi cả hai nơi một lượt.

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

**Đồ hoạ bắt buộc:**
- [ ] App icon 512×512 (`assets/images/icon.png`)
- [ ] Feature graphic 1024×500
- [ ] Screenshot dọc — Play cần tối thiểu 2, chuẩn bị 6 theo danh sách màn ở Session 14 Bước 4
      (Báo cáo PDF · Log · Nhắc đo · Hôm nay · Trends · chia sẻ qua Zalo)
- [ ] Email liên hệ = email trong privacy policy (mục 1)

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
