# Sugar — Kế hoạch tăng trưởng & Monetization

**Phiên bản 1.0 — 07/2026 · Mục tiêu: 10 triệu VND/tháng trong 12–18 tháng**
Trạng thái hiện tại: S1–S9 xong, core tracking local-first (Expo + expo-sqlite + Drizzle), chưa có auth/paywall.

---

## 0. Tóm tắt chiến lược (đọc trong 1 phút)

1. Positioning lại thành **app tiểu đường thai kỳ (GDM) cho mẹ Việt** — không phải app đường huyết chung chung.
2. Giá trị lõi = **thay tờ giấy bệnh viện phát**: ghi 2 chạm → nhắc đúng giờ sau bữa ăn → xuất PDF đúng bảng bác sĩ quen nhìn.
3. Kiếm tiền chính bằng **mua đứt Sugar Pro 149k** (báo cáo không giới hạn, backup cloud, biểu đồ nâng cao, không ads). Ads banner + affiliate que thử là nguồn phụ.
4. Kênh tăng trưởng chính: **Facebook group mẹ bầu** với bài post kể chuyện thật (làm app cho vợ) + ASO từ khóa "tiểu đường thai kỳ".
5. Không gamification. Retention đến từ reminder theo bữa ăn + khoảnh khắc "đưa báo cáo cho bác sĩ" + vòng đời hậu sản.

---

## 1. Vì sao positioning GDM (dù engine giống nhau)

Core engine ghi–xem–vẽ biểu đồ giống nhau, nhưng positioning quyết định 3 thứ:

| | App chung chung | App GDM |
|---|---|---|
| **Build gì trước** | không rõ ưu tiên | tuần thai, ngưỡng GDM, lịch đo 4 lần/ngày, report sản khoa |
| **Nói gì trên store** | "theo dõi đường huyết" — đấu với mySugr, Glucose Buddy | "tiểu đường thai kỳ" — keyword VN gần như trống |
| **Tìm user ở đâu** | phân tán, khó | group mẹ bầu FB — tập trung, miễn phí |

Tính năng chỉ GDM mới cần:
- Ngưỡng mặc định theo ADA: đói <5.3 mmol/L, sau ăn 1h <7.8, sau ăn 2h <6.7 — **luôn cho sửa** vì mỗi bác sĩ dặn khác nhau.
- Gắn tuần thai vào record và báo cáo.
- Chế độ "đã sinh": nhắc làm OGTT lại lúc 4–12 tuần hậu sản, sau đó nhắc tầm soát định kỳ (người từng GDM có nguy cơ tiến triển type 2 cao hơn hẳn).

**Vòng đời user GDM:** chẩn đoán tuần 24–28 → đo 4–6 lần/ngày trong 12–16 tuần → sinh → OGTT hậu sản → tầm soát mỗi 1–3 năm. Churn sau sinh là *by design*: bù bằng cohort mẹ bầu mới được chẩn đoán mỗi tháng, một phần user chuyển sang theo dõi dài hạn, và mẹ đã "tốt nghiệp" giới thiệu trong group.

---

## 2. Personas

**P1 — Mẹ bầu GDM (chính).** Chẩn đoán ~tuần 24–28 qua OGTT. Bác sĩ bắt đo 4–6 lần/ngày, ghi vào tờ giấy viện phát, mang theo mỗi lần khám (2–4 tuần/lần). Lo lắng cao vì sợ ảnh hưởng đến con. Sống trong các group FB mẹ bầu. Sẵn sàng chi cho thứ giúp con an toàn.

**P2 — Người tiểu đường type 2 lớn tuổi (phụ, làm sau).** Ghi sổ giấy hoặc không ghi, nhắn số cho con qua Zalo. Cơ hội tương lai: tính năng người thân theo dõi từ xa.

**P3 — Con cái/người chăm sóc (tương lai).** Người thực sự cài app và trả tiền cho P2.

---

## 3. Store listing & ASO

"Đổi store listing" = đổi bộ mặt app trên Google Play / App Store Connect (không cần đổi code):

- **Tên** (Play tối đa 30 ký tự): `Sugar – Sổ tiểu đường thai kỳ`
- **Mô tả ngắn** (80 ký tự): `Ghi đường huyết 2 chạm, nhắc đo sau bữa ăn, xuất báo cáo đưa bác sĩ`
- **Từ khóa** (iOS keyword field / rải tự nhiên trong mô tả Play): tiểu đường thai kỳ, đường huyết, mẹ bầu, GDM, sổ theo dõi đường huyết, đo đường huyết, glucose, thai kỳ
- **Screenshots** (5–6 cái, chữ to đọc được trên thumbnail):
  1. Báo cáo PDF — headline "Thay tờ giấy bệnh viện phát"
  2. Màn log — "Ghi xong trong 5 giây"
  3. Notification — "Tự nhắc đo sau ăn 1h/2h"
  4. Biểu đồ tuần — "Thấy ngay xu hướng"
  5. Share Zalo — "Gửi thẳng cho bác sĩ, người thân"
- Category: Medical hoặc Health & Fitness. Privacy policy URL là bắt buộc (GitHub Pages đủ dùng).

Chi tiết thực thi nằm ở Session 18.

---

## 4. Free vs Pro

**Nguyên tắc bất di bất dịch: không bao giờ chặn nhập liệu và xem dữ liệu của chính họ.** Đây là dữ liệu sức khỏe — chặn là mất trust vĩnh viễn. Paywall đặt ở "giá trị phái sinh".

| Tính năng | Free | Pro — mua đứt 149k |
|---|---|---|
| Ghi record, history, đặt ngưỡng | ✅ không giới hạn | ✅ |
| Reminder theo bữa ăn | ✅ | ✅ |
| Báo cáo PDF cho bác sĩ | Lần đầu miễn phí | ✅ không giới hạn |
| Backup & restore cloud | — | ✅ |
| Biểu đồ nâng cao, export CSV | — | ✅ |
| Quảng cáo | 1 banner ở màn History | Không có |

**Vì sao report free lần đầu:** để user trải nghiệm khoảnh khắc "bác sĩ gật gù" một lần. Từ lần khám thứ 2 (mỗi 2–4 tuần) là lúc họ sẵn sàng trả nhất. Bản free có watermark nhỏ "Tạo bởi app Sugar" ở footer — chính bác sĩ và các mẹ trong phòng khám là kênh lan truyền.

**Giá:** 149k launch (hiển thị neo 199k gạch ngang). Cohort đầu tiên có thể 99k đổi lấy feedback + review. Cân nhắc thêm subscription 25k/tháng *sau này* khi có tệp type 2 dài hạn.

> ⚠️ **Bắt buộc bán qua In-App Purchase** của Apple/Google. Bán "Pro" bằng chuyển khoản/MoMo cho tính năng digital là vi phạm policy store, có thể bị gỡ app. Nhiều dev VN dính lỗi này.

---

## 5. Bài toán 10 triệu/tháng

- 149k − 15% phí store ≈ **127k net/sale** → cần **~79 sales/tháng**.
- Conversion free→Pro ước 2–5% (niche report-driven có thể chạm cận trên) → cần **1.600–4.000 user mới/tháng** khi vào guồng.
- Nguồn phụ:
  - **Affiliate que thử** (Shopee): que thử 200–400k/hộp, mua lặp lại hằng tháng, hoa hồng vài % → ước 0.5–1.5tr/tháng khi có 1–2k MAU.
  - **Ads banner**: eCPM VN thấp, vài trăm DAU → ~0.2–0.9tr/tháng. Giá trị chính là tạo lý do upsell "tắt quảng cáo".
- **Lộ trình thực tế:** tháng 3–4 có sales đầu tiên · tháng 6 đạt 1–3tr/tháng · tháng 12–18 chạm 10tr nếu giữ nhịp acquisition.
- **Thuế:** doanh thu từ Google/Apple của cá nhân VN phải tự kê khai (cá nhân kinh doanh thường ~7% doanh thu — xác nhận lại với kế toán/chi cục thuế trước khi có tiền về).

---

## 6. Roadmap theo session (paste được vào PLAN.md)

Mỗi session scope vừa một phiên Claude Code. Thứ tự: **giá trị trước → tiền sau → tăng trưởng cuối.**

### Phase A — Giá trị GDM (S10–S12), làm ngay

**S10 — GDM profile & targets**
- Goal: app hiểu khái niệm "thai kỳ".
- Scope: bảng `pregnancy_profile` (due date → tự tính tuần thai); ngưỡng mặc định GDM (mmol/L) có thể sửa "theo chỉ định bác sĩ"; thêm `meal_tag` (fasting / after_breakfast / after_lunch / after_dinner) và `timing` (1h/2h) vào record; badge xanh/đỏ theo ngưỡng ở history.
- Tech: Drizzle migration; mở rộng settings screen.
- DoD: record mới có meal_tag; đổi ngưỡng không phá record cũ; history hiển thị màu đúng.

**S11 — Reminder theo bữa ăn**
- Goal: user không cần nhớ giờ đo — lý do mở app số 1.
- Scope: user đặt giờ dậy + giờ 3 bữa; `expo-notifications` schedule local: đo đói lúc dậy, sau mỗi bữa +1h hoặc +2h theo setting; tap notification mở thẳng form log với meal_tag điền sẵn; bật/tắt từng mốc.
- DoD: kill app vẫn nhận noti; đổi giờ ăn thì reschedule đúng; không bắn trùng.

**S12 — Báo cáo PDF cho bác sĩ ⭐ (value moment)**
- Scope: `expo-print` (HTML→PDF); bảng ngày × [đói | sau sáng | sau trưa | sau tối] mô phỏng đúng tờ giấy viện phát; tô đỏ giá trị vượt ngưỡng; header có tên + tuần thai + khoảng ngày + ngưỡng đang dùng; footer thống kê % đạt; nút share (Zalo/in); watermark nhỏ "Tạo bởi Sugar" trên bản free.
- DoD: PDF mở đẹp trên Zalo và iOS Files; 2 tuần dữ liệu vừa 1 trang A4.

### Phase B — Monetization rails (S13–S17)

**S13 — IAP & Paywall (RevenueCat)**
- Product non-consumable `sugar_pro_lifetime` 149k; màn paywall so sánh Free/Pro + nút Restore purchases; cần EAS dev build (không chạy trong Expo Go); test sandbox cả 2 store. RevenueCat có free tier, quá đủ giai đoạn đầu.
- Chuẩn bị trước: tài khoản merchant/thuế trên Play Console & App Store Connect duyệt mất vài ngày — đăng ký sớm.

**S14 — Gating Free/Pro**
- Hook `useIsPro()` check entitlement tập trung; gate: report từ lần 2, backup, CSV, advanced charts; đếm số report đã tạo (local).

**S15 — Auth Supabase**
- Sign in with Apple + Google (Apple bắt buộc có Sign in with Apple nếu dùng social login); **anonymous-first** — app dùng được đầy đủ không cần account; account chỉ phục vụ backup. Lưu ý: restore purchase KHÔNG cần account, store tự lo.

**S16 — Cloud backup/restore (Pro)**
- Snapshot SQLite → Supabase (per-user, RLS chặt); auto hằng tuần + nút manual; restore khi cài máy mới; hiển thị "backup gần nhất". Không build sync 2 chiều multi-device — overkill, chỉ cần backup/restore.

**S17 — Ads bản free (có thể skip)**
- `react-native-google-mobile-ads`, đúng 1 adaptive banner ở màn History; không interstitial, không ads trong flow nhập liệu — trải nghiệm sạch chính là điểm bán so với app bạn từng test. Trade-off nếu skip: mất upsell "tắt quảng cáo".

### Phase C — Growth (S18–S21)

**S18 — ASO assets**: đổi tên/mô tả/keywords theo mục 3; 6 screenshots có headline; trang privacy policy; điền Data Safety (Play) / App Privacy (iOS).

**S19 — Launch & review loop**: bài post theo template mục 7; `expo-store-review` xin đánh giá sau lần tạo report thứ 2 thành công; Google Form phỏng vấn 10 user đầu (tặng Pro đổi 30 phút gọi điện).

**S20 — Hậu sản + Affiliate**: qua due date → hỏi "mẹ sinh bé chưa?" → mode hậu sản: nhắc OGTT 4–12 tuần sau sinh + nhắc tầm soát định kỳ hằng năm; màn "Vật tư" với link affiliate Shopee (que thử, kim chích, máy đo) — ghi rõ là link tiếp thị, chọn đúng loại que phổ biến.

**S21 (optional) — Polish**: widget quick-log (effort cao với Expo, cần native target — để sau), onboarding 3 màn, landing page 1 trang.

---

## 7. Playbook Facebook groups

**Group nên vào:** "Hội mẹ bầu [tháng/năm dự sinh]", group tiểu đường thai kỳ, group theo bệnh viện (Từ Dũ, Hùng Vương, Phụ sản Hà Nội...), group dinh dưỡng cho bà bầu.

**Luật sống còn:** đọc rule group trước; **hỏi admin trước khi post**; link để dưới comment (nhiều group chặn link trong bài); trả lời mọi comment trong 24h; không đăng lại cùng bài trong <2 tuần/group.

**Template bài (chỉnh theo giọng bạn, nhờ vợ duyệt):**

> Chào các mẹ, vợ mình phát hiện tiểu đường thai kỳ ở tuần 26. Bệnh viện phát tờ giấy kẻ ô bắt ghi đường huyết 4 lần/ngày — tờ giấy thì nhàu, lúc đi khám lại quên ở nhà 😅. Mình làm dev nên viết luôn một app nhỏ cho vợ: 2 chạm là lưu xong, đến giờ đo app tự nhắc, đi khám thì xuất đúng cái bảng như tờ của viện đưa bác sĩ xem. Giờ vợ mình sinh xong mẹ tròn con vuông rồi, app để không cũng phí nên mình chia sẻ cho mẹ nào đang cần, dùng free. Mẹ nào dùng thấy thiếu gì cứ comment, mình làm thêm. Link ở dưới comment nhé.

**Nhịp triển khai:** tuần 1–2 chỉ tương tác thật, trả lời câu hỏi trong group, chưa nhắc app · tuần 3 post ở 2–3 group đã xin phép, thu 10 user phỏng vấn · tuần 4+ mỗi tuần thêm 1–2 group mới, quay lại group cũ khi có update đáng kể.

---

## 8. Retention — "kích thích họ vào app"

Động lực đo là **ngoại sinh** (lời dặn bác sĩ + lo cho con) — app không tạo ra nó được, app chỉ loại bỏ mọi lý do bỏ cuộc:

1. Reminder đúng ngữ cảnh bữa ăn (S11) — lý do mở app số 1.
2. Log <5 giây, form điền sẵn từ notification.
3. Khoảnh khắc giá trị mỗi 2–4 tuần: xuất report đi khám (S12).
4. Weekly summary notification: "Tuần này mẹ đo 24/28 lần, 86% trong ngưỡng 👍" — mang tính thông tin, không phải điểm số.
5. Data lock-in: càng nhập nhiều càng khó rời; backup cloud củng cố điều này.
6. Arc hậu sản (S20) kéo user quay lại sau khi "tốt nghiệp".

**Anti-pattern:** streak, badge, points — với bệnh lý dễ gây cảm giác tội lỗi khi lỡ nhịp và churn ngược. Đừng làm.

---

## 9. Metrics & mốc kiểm tra

- **North star:** số báo cáo PDF được tạo mỗi tuần (proxy cho giá trị thật).
- **Activation:** user log ≥12 lần trong 7 ngày đầu (≈3 lần/ngày × 4 ngày).

| Mốc | Kỳ vọng |
|---|---|
| Tháng 1–2 | 100+ installs, 5 phỏng vấn user, 30% user tạo report |
| Tháng 3–4 | Paywall live, ≥10 sales đầu tiên, conversion ≥2% |
| Tháng 6 | 1.000+ installs lũy kế, doanh thu 1–3tr/tháng |
| Tháng 12–18 | 10tr/tháng |

**Kill/pivot criteria:** 3 tháng sau launch mà <500 installs hoặc conversion <1.5% → đổi kênh hoặc positioning trước khi build thêm. 6 tháng mà tổng thu <2tr/tháng → chuyển app sang maintenance mode, dồn sức freelance cho mục tiêu thu nhập, giữ app làm portfolio.

---

## 10. Rủi ro & tuân thủ

- **Tuyệt đối không** gợi ý liều insulin/thuốc, không đưa "chẩn đoán" — app chỉ ghi chép và trình bày. Disclaimer rõ ràng: "không thay thế tư vấn y khoa".
- Ngưỡng mặc định luôn sửa được — mỗi bác sĩ chỉ định khác nhau.
- Privacy policy + Data Safety form bắt buộc; dữ liệu sức khỏe → RLS chặt trên Supabase; cam kết không bán data và **nói rõ điều đó** — là điểm cộng marketing với các mẹ.
- Cạnh tranh: mySugr, Glucose Buddy mạnh nhưng tiếng Anh, subscription đắt, không có ngữ cảnh VN. Cửa của bạn: tiếng Việt + GDM + mua đứt rẻ + báo cáo đúng format viện.
- Rủi ro bị ban group: luôn xin admin, giữ giọng chia sẻ, không spam.

---

## 11. Không làm bây giờ (scope discipline)

Food database đếm carb món Việt (hố đen effort — để phase sau nếu user đòi), community/chat trong app, AI phân tích bữa ăn, đồng bộ Apple Health/Google Fit, đa ngôn ngữ. Và **không làm game** — median revenue game đầu tay của solo dev xấp xỉ 0, sai công cụ cho mục tiêu backup income.

---

## 12. Checklist 7 ngày tới

- [ ] **D1–2:** chạy S10 với Claude Code (paste spec mục 6 vào PLAN.md)
- [ ] **D3:** S11 — reminder theo bữa ăn
- [ ] **D4–5:** S12 — báo cáo PDF, ưu tiên số 1, đây mới là "sản phẩm"
- [ ] **D6:** join 5–10 group mẹ bầu bằng account thật, đọc rule, bắt đầu comment hữu ích (chưa nhắc app)
- [ ] **D7:** draft bài post theo template, nhờ vợ duyệt giọng văn; nhắn xin phép admin 2–3 group
- [ ] Đăng ký RevenueCat + hoàn thiện hồ sơ merchant trên Play Console / App Store Connect (duyệt mất vài ngày, làm sớm)
