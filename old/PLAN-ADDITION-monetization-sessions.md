# PLAN addition — Monetization & Growth (Sessions 15–22)

Continues `PLAN-ADDITION-gdm-sessions_1.md` (Sessions 10–14). Written 2026-07-07 against repo state: Sessions 1–9 + 4.5 done, Sessions 10–14 specced. This file covers everything remaining in `SUGAR-GROWTH-PLAN.md`: growth-plan **S13–S17 → Sessions 15–19** (money rails) and **S19–S21 → Sessions 20–22** (growth loop). Paste the session blocks into `PLAN.md` after Session 14; paste the PRD amendment into `PRD.md`'s changelog.

**Verified 2026-07-07 (facts the money plan depends on):**
- Vietnam **supports Google Play merchant registration** (paid apps + IAP allowed; payout in USD/EUR). Selling Pro via IAP from a VN individual account is viable.
- RevenueCat is **free up to $2,500 MTR/month** (≈64tr VND gross) then 1% — the 10tr/tháng goal lives entirely inside the free tier.
- Personal Play Console accounts created **after 13/11/2023** must run a closed test with **≥12 opted-in testers for 14 continuous days** before production. **Không áp dụng cho bạn** — account tạo trước mốc này → submit thẳng production sau Session 14 (xem Timeline).
- Aptabase (analytics ẩn danh — khuyến nghị ở Session 15): **free 20.000 events/tháng**, dữ liệu anonymized hoàn toàn (không device ID, không định danh người dùng, không cần consent banner); vượt limit thì analytics tạm dừng đến đầu tháng sau, **không phát sinh phí**.

**Money principles for all sessions below:**
1. *Free tier is sacred* (growth plan §4): nhập liệu, xem/sửa/xóa dữ liệu, reminder, biểu đồ cơ bản, và báo cáo PDF **đầu tiên** — không bao giờ gate. Paywall chỉ đứng ở giá trị phái sinh.
2. *One entitlement source of truth:* mọi gate đi qua một hook `useIsPro()` (RevenueCat entitlement `pro`). Không bao giờ có check mua hàng rải rác trong component.
3. *Sell only what's shipped:* danh sách quyền lợi trên paywall là một config array (`PRO_BENEFITS`); mỗi session ship xong feature Pro mới được thêm dòng tương ứng. Không bán tính năng chưa tồn tại.
4. *Privacy story evolves honestly:* "không thu thập dữ liệu" → "**dữ liệu đường huyết chỉ nằm trên máy; chỉ rời máy khi mẹ bật sao lưu**". Data Safety (Play) / App Privacy (iOS) được cập nhật đúng từng mốc: S15 (purchase data + app interactions ẩn danh nếu bật analytics), S18 (backup opt-in), S19 (ads — nếu làm).
5. *IAP only:* mọi giao dịch digital qua Apple/Google IAP. Không bán Pro qua MoMo/chuyển khoản — vi phạm policy store, có thể bị gỡ app (giữ nguyên warning growth plan §4).

---

### Session 15: IAP rails + Paywall — RevenueCat (growth plan S13)
**Goal:** app biết nhận tiền — purchase, restore, entitlement chạy ổn định trên Android (kiến trúc sẵn sàng cho iOS sau).

**Prereq (admin track, xem cuối file):** Play merchant/payments profile đã verify; RevenueCat project đã tạo. Mấy bước duyệt này mất vài ngày — phải xong TRƯỚC session này. *(App Store Connect Paid Apps agreement dời sang checklist "Khi mở iOS".)*

- Dependency: `react-native-purchases` (RevenueCat RN SDK). Native module → chỉ chạy trên **EAS dev build** (config từ Session 14), không chạy trong Expo Go.
- Store products (**Android trước — iOS thêm sau, xem Timeline**):
  - Play Console: in-app product (one-time/managed) `sugar_pro_lifetime`, giá **149.000₫**.
  - RevenueCat: entitlement `pro`, offering `default` chứa lifetime package — project chỉ cần app Android lúc này. Public SDK key qua EAS env vars — không commit key.
  - *Khi mở iOS:* App Store Connect non-consumable `sugar_pro_lifetime` (price point VND tương đương) + thêm app iOS vào RC project — entitlement/offering giữ nguyên, code không đổi.
- **Giá hiển thị lấy từ store** (`product.priceString`), không hardcode "149k" trong UI — đổi giá/promo sau này không cần release. Play VN hỗ trợ thẻ nội địa/ví điện tử (MoMo…) nên mẹ không cần thẻ tín dụng — verify danh sách payment method hiện tại khi viết copy paywall.
- **Không dùng fake anchor "199k gạch ngang"** khi chưa từng bán ở giá 199k — reference price ảo là rủi ro bị store reject + vi phạm luật quảng cáo. Dùng copy "Giá ra mắt" thay thế. *(Deviation từ growth plan §4 — ghi ở bảng mapping.)*
- Architecture (đúng layering CLAUDE.md): port `EntitlementRepository` trong `src/domain/repositories/` (`isPro()`, `purchasePro()`, `restore()`, `getProProduct()`); adapter RevenueCat trong `src/data/`; `useIsPro()` hook (zustand cache, refresh khi app foreground + sau purchase/restore). RC cache CustomerInfo offline → Pro vẫn Pro khi mất mạng.
- Paywall screen `app/paywall.tsx` (modal route), build trên primitives: so sánh Free/Pro từ `PRO_BENEFITS` config (khởi điểm chỉ gồm feature đã ship khi session 16 xong: báo cáo không giới hạn + không watermark, export CSV, phân tích theo bữa — dòng backup được Session 18 thêm sau); CTA "Mở khóa Sugar Pro — {priceString}"; secondary "Khôi phục giao dịch"; footnote "Thanh toán một lần qua App Store / Google Play". States: loading offering / pending / cancelled (im lặng quay lại) / error (toast + retry) / success (haptic + dismiss).
- Route param `paywallSource` (`report_gate | csv_gate | charts_gate | backup_gate | settings`) → tăng counter local (settings key) để biết gate nào convert.
- **Analytics ẩn danh tối giản (khuyến nghị — bỏ được nếu muốn privacy tuyệt đối):** `@aptabase/react-native` — free 20k events/tháng, dữ liệu anonymized hoàn toàn (không device ID, không định danh), không cần consent banner; vượt limit chỉ tạm dừng, không phát sinh phí. Đúng **6 events**, không bao giờ đính kèm giá trị đường huyết: `onboarding_completed {mode}` · `first_reading_logged` · `report_exported {count}` · `paywall_viewed {source}` · `purchase_completed` · `backup_enabled`. Wrapper mỏng `src/data/analytics.ts` (mọi call site đi qua đây) + toggle "Gửi thống kê sử dụng ẩn danh" trong Settings (default bật; tắt = no-op). Không có nó, sau launch bạn chỉ thấy *installs* (Play Console) và *sales* (RevenueCat) — không biết phễu rò ở bước nào để sửa. Nếu kịp, init SDK ngay từ build Session 14 để đo cohort đầu tiên từ lúc cài.
- Settings root: row "Sugar Pro" (icon crown) → paywall; khi đã Pro hiển thị "Đã mở khóa ✓".
- Dev escape hatch: toggle `devPro` chỉ hiện khi `__DEV__` (hidden debug screen) để build UI gated trong Expo Go/simulator; logic release chỉ đọc entitlement thật.
- Sandbox test: Play → license testers + internal testing track. *(iOS: Sandbox Apple ID + StoreKit config file — làm ở session mở iOS.)*
- Toàn bộ strings i18n vi + en.

**Accept:** sandbox purchase trên Android unlock entitlement `pro` (lặp lại checklist này cho iOS khi mở App Store), giữ sau khi restart app và ở airplane mode; xóa app cài lại → Restore unlock không tính tiền lần 2; cancel giữa chừng quay lại paywall không lỗi; đổi giá trong console → app hiển thị giá mới không cần release; `tsc` + tests green (test hook logic với adapter mock). Commit: `feat: revenuecat iap and paywall`

---

### Session 16: Free/Pro gating + phân tích "Theo bữa" (growth plan S14)
**Goal:** bật công tắc kiếm tiền — free vẫn hào phóng, Pro bán giá trị thật đã ship.

- Helper duy nhất `useProGate(feature)`: check `useIsPro()`, nếu free → mở paywall với `paywallSource` tương ứng. Mọi gate đi qua helper này.
- **Gate 1 — Báo cáo PDF từ lần 2:** free khi `reportCount === 0`; từ lần xuất thứ 2, non-Pro → paywall (`report_gate`) với copy ngữ cảnh: *"Mẹ đã dùng 1 báo cáo miễn phí. Mở khóa Pro để xuất không giới hạn cho các lần khám sau."* `reportCount` đã đếm từ Session 13 → user cũ đã từng xuất sẽ gặp gate ở lần xuất kế tiếp sau update (đúng chủ đích growth plan).
- **Gate 2 — Watermark:** `ReportService` nhận flag `isPro` → bản Pro bỏ footer "Tạo bởi app Sugar"; bản free giữ (chính là kênh lan truyền ở phòng khám).
- **Gate 3 — CSV export:** chuyển thành Pro-only (tab CSV trong Settings → Export hiện khóa → paywall `csv_gate`). *Supersedes PRD v1.1 (CSV từng là core-free) — ghi vào PRD v1.4. App chưa launch nên không lấy đi của user thật nào.*
- **Gate 4 — "Biểu đồ nâng cao" được định nghĩa cụ thể = phân tích Theo bữa** (ship ngay trong session này, không bán vapor):
  - Domain: `computeSlotStats(readings, range, gdmTiming, targets)` → cho 4 slot [Đói | Sau sáng | Sau trưa | Sau tối]: số lần đo, trung bình (đơn vị ưa thích), % trong ngưỡng, chênh lệch vs kỳ trước cùng độ dài. Pure TS, tái dùng `getDaySlots`, unit-tested.
  - UI: segmented "Xu hướng | Theo bữa" trên Trends (chỉ hiện khi `conditionType === 'gestational'`); 4 `Card` trên primitives; free user thấy lock overlay → paywall (`charts_gate`).
- **Không bao giờ gate:** logging, history, edit/delete, line chart cơ bản, reminders, settings, báo cáo đầu tiên.
- Chưa đụng gì tới ads slot (đó là Session 19 — nếu làm).

**Accept:** flow free user — xuất PDF lần 1 OK, lần 2 mở paywall, mua ngay giữa flow → export tiếp tục chạy; PDF của Pro không còn watermark; CSV khóa/mở đúng theo entitlement; tests `computeSlotStats` phủ: slot trùng reading, slot rỗng, delta kỳ trước, hiển thị đúng đơn vị; user `general`/`type2` không thấy segment "Theo bữa" và không đổi hành vi gì ngoài CSV gate; `tsc` + tests green. Commit: `feat: free/pro gating and per-meal analysis`

---

### Session 17: Supabase Auth — anonymous-first (growth plan S15)
**Goal:** danh tính chỉ tồn tại để phục vụ backup — app không bao giờ đòi đăng nhập.

- Supabase project region **Singapore (ap-southeast-1)** — gần VN nhất; keys qua app config/EAS env.
- `@supabase/supabase-js` + session storage adapter trên **expo-secure-store** (token nằm trong Keychain/Keystore, không phải AsyncStorage).
- Native sign-in (cần dev build):
  - **Google (làm ngay):** `@react-native-google-signin/google-signin` → idToken → `signInWithIdToken({provider:'google'})`. OAuth clients từ Google Cloud Console: **web client ID** (bắt buộc để lấy idToken) + Android client (khớp SHA-1 của EAS build) — nằm trong admin track.
  - **Sign in with Apple (defer tới lúc mở iOS):** `expo-apple-authentication` → `signInWithIdToken({provider:'apple'})`. Bắt buộc theo App Review 4.8 khi app iOS có social login — bản Android không cần. Render nút provider từ một config array để lúc đó bật Apple chỉ là thêm 1 entry.
- Settings → màn "Tài khoản & sao lưu": trạng thái chưa đăng nhập = 1 dòng giải thích *"Chỉ dùng để sao lưu dữ liệu lên cloud — app vẫn dùng đầy đủ khi không đăng nhập"* + 2 nút provider; đã đăng nhập = provider/email, chỗ chờ cho backup status (Session 18), Đăng xuất, Xóa tài khoản.
- **Xóa tài khoản in-app** (bắt buộc theo **cả hai store** — Play User Data policy yêu cầu xóa in-app *và* một web URL nhận yêu cầu xóa khai trong Data Safety; Apple 5.1.1(v) áp dụng khi lên iOS): Supabase **Edge Function `delete-account`** (verify JWT → `auth.admin.deleteUser` + xóa toàn bộ objects `backups/{uid}/`); client double-confirm: *"Xóa tài khoản và toàn bộ bản sao lưu trên cloud. Dữ liệu trên máy vẫn giữ nguyên."* → sign out sau khi xóa. Kèm **trang web "Yêu cầu xóa tài khoản"** (GitHub Pages, cạnh privacy policy) hướng dẫn cách xóa in-app + email liên hệ — URL này điền vào Data Safety form (admin track).
- RevenueCat link: `Purchases.logIn(user.id)` khi đăng nhập, `logOut()` khi đăng xuất — phục vụ tra cứu support; entitlement vẫn hoạt động khi signed-out (store-based). **Restore purchases KHÔNG cần account** — giữ nguyên nguyên tắc growth plan.
- Session này **không tạo bảng DB nào**; chỉ auth + edge function. Assert: không có auth check nào ngoài màn Account và backup flow.

**Accept:** đăng nhập được bằng Google trên thiết bị thật (Apple thêm ở session mở iOS); session sống qua restart (secure store); đăng xuất sạch; xóa tài khoản → user biến mất trong Supabase dashboard + storage prefix bị xóa, flow tìm được trong ≤3 taps từ Settings; toàn bộ app (log/history/report/reminder) hoạt động y nguyên khi chưa đăng nhập; `tsc` + tests green. Commit: `feat: supabase auth, account screen, delete account`

---

### Session 18: Cloud backup & restore — Pro ⭐ (growth plan S16)
**Goal:** "yên tâm đổi máy" — lý do trả tiền thứ hai sau báo cáo, và là chân data-lock-in của retention (§8.5).

- Supabase side:
  - Private Storage bucket `backups`; storage policy: chỉ đọc/ghi object có prefix `auth.uid()/`.
  - Bảng `backup_meta` (`user_id` PK/FK auth.users, `updated_at`, `schema_version`, `app_version`, `size_bytes`, `device_label`) — RLS owner-only.
  - **Single-slot design:** chỉ giữ bản mới nhất mỗi user (`backups/{uid}/sugar.db`, upload upsert). Vừa khít free tier 1GB storage (snapshot <1MB → 1.000+ user thoải mái), UX một nút, không cần UI chọn version.
- `BackupService` (data layer): `PRAGMA wal_checkpoint(TRUNCATE)` → copy file sqlite (`${documentDirectory}SQLite/<dbName>` qua expo-file-system) ra cache → upload upsert → upsert `backup_meta` (`schema_version` = migration id mới nhất của local drizzle) → set settings key `lastBackupAt`.
- **Auto backup không cần background task:** mỗi lần app foreground, nếu `isPro && session && now − lastBackupAt > 7 ngày` → backup im lặng. Trung thực, zero battery cost, đủ tốt cho use case.
- **Restore flow:** màn Account hiển thị "Sao lưu gần nhất: {ngày} · {size}" + nút "Khôi phục về máy này". Confirm cảnh báo ghi đè dữ liệu local → download về temp → sanity check (SQLite magic header) → **từ chối nếu `schema_version` > migration mới nhất của app** (*"Bản sao lưu được tạo từ phiên bản mới hơn — hãy cập nhật app trước"*) → `closeDb()` (expose từ db client module) → thay file → mở lại (snapshot cũ hơn sẽ được drizzle migrate tự động khi mở) → reset/re-hydrate zustand stores → màn thành công.
- Gate: toàn bộ feature là Pro (`backup_gate`); thêm dòng "Sao lưu & khôi phục cloud" vào `PRO_BENEFITS` của Session 15 — bây giờ mới được bán vì bây giờ mới ship.
- Privacy: cập nhật trang privacy policy + Data Safety/App Privacy: *"Dữ liệu chỉ rời máy khi mẹ bật sao lưu; lưu trữ mã hóa at-rest; không bán/chia sẻ cho bên thứ ba."* Client-side E2E encryption **deferred có chủ đích** (mất key = mất backup — bẫy UX với user không rành kỹ thuật); ghi rõ trade-off trong privacy policy.
- Ops caution: Supabase free tier hiện **pause project sau ~1 tuần không có traffic** — hết là vấn đề khi user thật backup hằng tuần; giai đoạn trước đó thì unpause tay hoặc ping định kỳ. Chỉ lên $25/mo khi user thật sự phụ thuộc backup.

**Accept:** round-trip: backup → Delete All Data (Session 6) → restore → readings + settings giống hệt; restore snapshot schema cũ hơn → migrate sạch; snapshot schema mới hơn → bị từ chối kèm message cập nhật app; kiểm chứng RLS thủ công: JWT của user A GET object của user B qua REST → 403; non-Pro thấy locked state; auto-backup chạy đúng 1 lần/7 ngày, không phải mỗi lần foreground; `tsc` + tests green (BackupService logic test với storage mock). Commit: `feat: cloud backup and restore`

---

### Session 19 (optional — khuyến nghị mặc định: SKIP): Banner ads cho bản free (growth plan S17)
**Decision gate trước, code sau.** Chỉ build khi — sau 6–8 tuần paywall live — conversion <2% VÀ cần thêm lý do upsell "tắt quảng cáo". Lý do nghiêng về skip: eCPM VN thấp (growth plan §5 ước ~0.2–0.9tr/tháng ở vài trăm DAU); AdMob SDK phá câu chuyện privacy nặng nhất trong toàn bộ app (device IDs/ad data vào Data Safety); và "sạch, không quảng cáo" đang là điểm bán so với app cạnh tranh. Affiliate (Session 21) hợp tệp mẹ bầu hơn hẳn.

Nếu quyết định build:
- `react-native-google-mobile-ads` + config plugin (AdMob app IDs trong app.json) → cần EAS build mới.
- Đúng **một** adaptive banner, đáy màn History. Tuyệt đối không interstitial, không ads ở Log/Hôm nay/Report — trải nghiệm nhập liệu sạch là bất khả xâm phạm.
- `useIsPro()` → render null: mua Pro là banner biến mất ngay, không cần restart.
- **Chỉ non-personalized ads** (`requestNonPersonalizedAdsOnly: true`) → khỏi ATT prompt trên iOS, bớt rủi ro policy với health app; fail-silent khi không fill (layout không giật).
- Cập nhật Data Safety (Play) + App Privacy (iOS) cho AdMob; thêm mục ads vào privacy policy; thêm "Không quảng cáo" vào `PRO_BENEFITS`.

**Accept:** banner chỉ hiện cho free user và chỉ ở History; mua Pro → biến mất tức thì; không có ads ở bất kỳ màn nhập liệu nào; app chạy bình thường khi ad request fail; `tsc` + tests green. Commit: `feat: admob banner for free tier`

---

### Session 20: Launch, review & retention loop (growth plan S19 + §8.4)
**Goal:** biến value moment thành review và feedback, và cho mẹ một lý do dễ chịu để nhìn lại mỗi tuần.

- **Review prompt** (`expo-store-review`): xin đánh giá sau **lần xuất báo cáo PDF thành công đầu tiên** — khi share sheet đóng và quay lại app → `requestReview()`; one-shot flag `reviewAskedAt`. *(Deviation từ growth plan "sau lần thứ 2": lần 2 giờ nằm sau paywall nên volume quá nhỏ; lần 1 vẫn là đỉnh value moment, và OS tự quota tần suất hiển thị.)* Fallback: reading thứ 20 nếu chưa từng hỏi. Không bao giờ tự hỏi lại.
- **Weekly summary notification** (growth plan §8.4): mỗi lần app foreground, cancel + reschedule notification id cố định `weekly-summary` vào Chủ nhật 19:30 kế tiếp; nội dung tính từ 7 ngày gần nhất: *"Tuần này mẹ đo {n}/{expected} lần, {p}% trong ngưỡng 👍"*. Rules: chỉ schedule khi tuần có **≥5 readings** (không nhắc người đã nghỉ/hậu sản); %-thấp dùng copy trung tính nâng đỡ, **không guilt, không streak** (anti-pattern §8); nội dung có thể hơi cũ nếu user không mở app — chấp nhận, comment rõ trong code. Domain `buildWeeklySummary(readings, now)` pure + unit-tested (đếm, %, <5 readings → null).
- **Feedback loop:** card nhỏ sau lần xuất report đầu + row trong Settings → link Google Form (URL trong constants). Màn About thêm **"Mã hỗ trợ"** = RevenueCat `appUserID` (copyable) → dùng để **tặng Pro cho 10 mẹ phỏng vấn** qua RevenueCat dashboard → Customer → *Grant promotional entitlement* — không cần viết thêm code tặng quà.
- **Checklist launch (không phải code — chuyển thành issue riêng):** bài post final theo template §7 (vợ duyệt giọng văn); danh sách group đã xin phép admin; tuần 1–2 chỉ tương tác thật; tuần 3 post 2–3 group; log mọi phản hồi vào form; trả lời comment trong 24h.

**Accept:** review prompt được gọi đúng 1 lần sau export đầu (verify `requestReview` invoked; OS quyết định render); weekly notification reschedule idempotent — luôn đúng 1 notification id, đúng CN kế tiếp (assert qua `getAllScheduledNotificationsAsync`); mã hỗ trợ hiển thị + copy được; `buildWeeklySummary` tests green; `tsc` + tests green. Commit: `feat: review prompt, weekly summary, feedback loop`

---

### Session 21: Vòng đời hậu sản + màn Vật tư affiliate (growth plan S20)
**Goal:** đóng vòng đời GDM một cách tử tế — churn sau sinh là by-design, nhưng app tiễn mẹ "tốt nghiệp" đúng cách và mở nguồn thu phụ hợp ngữ cảnh.

- **Trigger:** `conditionType === 'gestational' && dueDate && today ≥ dueDate` → header màn Hôm nay hiện soft prompt *"Mẹ sinh bé chưa? 🎉"* [Rồi ạ] [Chưa] — chọn "Chưa"/dismiss thì 7 ngày sau hỏi lại (`postpartumPromptSnoozedAt`).
- **"Rồi ạ" flow:** date picker `babyBornAt` (default hôm nay) → màn chúc mừng → đúng 1 câu hỏi: *"Tiếp tục nhắc đo theo bữa?"* (default **TẮT** — đa số được ngừng đo sau sinh) → tắt thì cancel toàn bộ meal reminders (Session 12 identifiers).
- **Postpartum mode** — đây là branch #4 trong nguyên tắc mode-switch của Session 10 (không thêm `conditionType` mới; chỉ là state `babyBornAt != null` của `gestational`):
  - Màn Hôm nay đổi thành `PostpartumCard`: *"Kiểm tra OGTT lại: tuần 4–12 sau sinh"* + countdown + nút "Đã làm OGTT ✓".
  - Schedule notification tại `babyBornAt + 4 tuần`, nhắc lại `+10 tuần` nếu chưa đánh dấu (copy dặn dò, dẫn nguồn khuyến nghị tầm soát — không chẩn đoán).
  - Sau khi đánh dấu (hoặc quá 12 tuần): đặt **nhắc tầm soát hằng năm** — schedule đúng 1 mốc kế tiếp, reschedule mỗi lần app mở (expo-notifications không có yearly trigger).
  - Secondary action: *"Tiếp tục theo dõi đường huyết dài hạn"* → confirm → re-apply preset `type2` hoặc `general` (dữ liệu giữ nguyên — đúng nguyên tắc preset-over-configuration của Session 10).
  - History/Trends/Report không đổi — mẹ vẫn xem và xuất dữ liệu thai kỳ cũ bất cứ lúc nào.
- **Màn "Vật tư đo đường huyết"** (Settings row + link nhỏ dưới organizer Hôm nay):
  - Danh sách tĩnh từ `src/config/supplies.ts`: que thử phổ biến VN (Accu-Chek, On Call Plus, Sinocare…), kim chích, máy đo — tên + 1 dòng mô tả + link Shopee affiliate, mở bằng `expo-web-browser`.
  - **Disclosure bắt buộc** đầu màn: *"Một số liên kết là link tiếp thị — Sugar nhận hoa hồng nhỏ, giá của mẹ không đổi."*
  - Link vật lý ra browser ngoài là hợp lệ với cả 2 store (IAP chỉ bắt buộc cho digital goods). URL đăng ký Shopee affiliate nằm ở admin track; cập nhật link sau này qua **EAS Update** (JS-only, không cần store review).
- Toàn bộ strings i18n vi + en.

**Accept:** giả lập `dueDate` quá khứ → prompt hiện đúng; "Rồi ạ" flow set `babyBornAt`, tắt meal reminders, schedule OGTT notification đúng ngày (assert `getAllScheduledNotificationsAsync`); đánh dấu OGTT → yearly reminder được đặt; "Tiếp tục theo dõi" chuyển preset không đụng records (`drizzle` không có migration mới); màn Vật tư mở link ngoài + disclosure hiển thị; `tsc` + tests green. Commit: `feat: postpartum arc and supplies screen`

---

### Session 22 (optional): Landing page + backlog triage (growth plan S21)
- **Landing 1 trang** trên GitHub Pages (cùng chỗ privacy policy): hero + 3 tính năng (report/nhắc đo/2 chạm) + 2 screenshots + store badges + link privacy; title SEO *"Sugar — Sổ theo dõi tiểu đường thai kỳ"*; gắn link vào store listing + màn About.
- Triage phần còn lại của growth plan S21:
  - Widget quick-log: **defer** — cần native widget target (WidgetKit/Glance) ngoài managed workflow, effort không xứng trước khi có traction. Ghi vào Deferred của PRD.
  - Onboarding 3 màn: **đã xong** ở Session 10 (onboarding v2) — skip.
  - Apple Health / Google Fit, food database, community: vẫn deferred theo §11.
- Polish tồn đọng nếu còn thời gian: empty states copy cho GDM mode, template screenshot share, rà lại 1.3× font scale trên các màn mới (paywall, account, vật tư).

**Accept:** landing live tại URL công khai, load nhanh trên mobile, mọi link hoạt động; backlog deferred được ghi lại trong PRD. Commit: `chore: landing page`

---

## PRD amendment — paste into PRD.md changelog

### v1.4 (2026-07-07)
- **Monetization in scope: Sugar Pro — mua đứt 149.000₫** qua In-App Purchase (Play one-time product / App Store non-consumable, id `sugar_pro_lifetime`), quản lý bằng RevenueCat entitlement `pro`. Nguyên tắc bất di bất dịch giữ nguyên từ growth plan §4: **không bao giờ gate nhập liệu và xem/sửa dữ liệu.**
- **Free/Pro matrix (chuẩn hóa):** Free = ghi/sửa/xóa không giới hạn, history, ngưỡng, reminders, trends cơ bản, weekly summary, **1 báo cáo PDF đầu tiên (có watermark)**. Pro = báo cáo PDF không giới hạn + không watermark, **export CSV** *(supersedes v1.1 — CSV chuyển từ core-free sang Pro; app chưa launch nên không lấy đi của user hiện hữu nào)*, phân tích "Theo bữa", sao lưu & khôi phục cloud, (không quảng cáo — chỉ khi Session 19 được kích hoạt).
- **Auth & backup un-deferred một phần:** Supabase auth **anonymous-first** (Google ngay; Sign in with Apple bổ sung khi phát hành iOS theo App Review 4.8; session trong secure store, **xóa tài khoản in-app + web URL yêu cầu xóa** theo Play User Data policy & Apple 5.1.1) + **cloud backup/restore single-slot** (Pro, bucket private + RLS, giữ bản mới nhất). **Two-way sync / multi-device vẫn deferred** — story 12–20 chỉ un-defer phần auth + backup.
- **Vòng đời hậu sản in scope:** `babyBornAt` (settings key, không migration), prompt sau `dueDate`, nhắc OGTT tuần 4–12 sau sinh + tầm soát hằng năm, chuyển preset dài hạn giữ nguyên dữ liệu.
- **Màn Vật tư (affiliate)** in scope: danh sách tĩnh, link Shopee mở browser ngoài, disclosure bắt buộc, cập nhật link qua EAS Update.
- **Notifications bổ sung:** weekly summary (local, CN 19:30, chỉ khi tuần có ≥5 readings, copy không guilt/streak).
- **Store review prompt policy:** hỏi đúng 1 lần, sau lần xuất PDF thành công đầu tiên (fallback: reading thứ 20).
- **New stories 61–71:** 61 mua Sugar Pro · 62 restore purchases · 63 gate báo cáo từ lần 2 (+ bỏ watermark cho Pro) · 64 phân tích Theo bữa (Pro) · 65 đăng nhập Google (Apple khi mở iOS) · 66 xóa tài khoản in-app · 67 backup cloud (Pro) · 68 restore về máy mới · 69 weekly summary notification · 70 vòng đời hậu sản + OGTT · 71 màn Vật tư affiliate. *(72 ads banner — optional, chỉ khi Session 19 được kích hoạt sau decision gate.)*
- **Data Safety (Play) / App Privacy (iOS) cập nhật theo mốc:** sau S15 = purchase data (qua RevenueCat, anonymous app user id) + app interactions ẩn danh (nếu bật analytics Aptabase — khai "data not linked to identity"); sau S18 = backup opt-in ("dữ liệu sức khỏe chỉ rời máy khi bật sao lưu, mã hóa at-rest, không bán/chia sẻ"); sau S19 (nếu làm) = advertising data. Câu marketing chuyển từ "không thu thập dữ liệu" → **"dữ liệu đường huyết chỉ nằm trên máy của mẹ"** — vẫn là điểm cộng lớn, và trung thực.

---

## Admin track — không cần code, làm NGAY (song song Sessions 10–14)

Mấy bước duyệt này mất ngày-tới-tuần và **chặn Session 15** nếu chưa xong:

1. **Play Console:** hoàn thiện payments profile + merchant profile (VN được hỗ trợ bán paid apps/IAP; payout USD/EUR). Duyệt vài ngày.
2. **RevenueCat:** tạo account + project + app Android (app iOS thêm sau). Free đến $2.500 MTR/tháng ≈ 64tr VND — mục tiêu 10tr/tháng nằm gọn trong free tier, phí = 0.
3. **Soft-launch cohort (khuyến nghị — không phải rào):** account của bạn tạo trước 13/11/2023 nên **không** bị yêu cầu closed testing 12 testers/14 ngày. Nhưng vẫn nên mời 10–15 mẹ từ group + người quen cài **internal testing** ~1 tuần trước khi public: vừa là nhóm phỏng vấn của playbook §7, vừa bắt crash/copy lỗi sớm.
4. **Supabase:** tạo org + project (Singapore) — cần cho Session 17.
5. **Google Cloud Console:** OAuth **web client ID** (bắt buộc cho idToken) + Android client (SHA-1 EAS build) cho Google Sign-In — Session 17.
6. **Trang "Yêu cầu xóa tài khoản"** trên GitHub Pages (cạnh privacy policy) — Play Data Safety yêu cầu URL này khi app có tạo tài khoản; phải có trước khi submit build chứa Session 17.
7. **Aptabase** (nếu chốt analytics ở Session 15): tạo account + lấy app key — free 20k events/tháng.
8. **Shopee affiliate:** đăng ký chương trình tiếp thị liên kết — Session 21.
9. **Thuế:** xác nhận với kế toán/chi cục thuế về kê khai doanh thu Google/Apple của cá nhân (~7% doanh thu theo growth plan §5) — trước khi tiền về, không phải sau.

**Khi quyết định mở iOS (checklist riêng — chưa cần đụng bây giờ):** Apple Developer Program $99/năm → App Store Connect: ký Paid Apps agreement + bank + tax → tạo non-consumable `sugar_pro_lifetime` + thêm app iOS vào RevenueCat → 1 session code: Sign in with Apple + StoreKit sandbox test + App Privacy form → TestFlight → submit review. Ước lượng: vài ngày admin + ~1 session — các điểm nối đã chuẩn bị sẵn (provider config array, entitlement chung, giá lấy từ store).

---

## Timeline & launch sequencing

Đã chốt theo câu trả lời của bạn: **Play account cá nhân tạo trước 13/11/2023 → không có rào closed-testing**, và **Android đi trước — iOS mở sau khi có tín hiệu.**

**Trình tự:**
1. Session 14 xong → submit **production trên Play** (nếu kịp, chạy internal testing cho cohort 10–15 mẹ ~1 tuần trước — admin track #3).
2. Soft launch trong group theo playbook §7 → Sessions 15–16 ship paywall qua bản update **~1–2 tuần sau launch**.
3. Sessions 17–18 (auth + backup) → 20 (review/retention loop) → 21 (hậu sản + vật tư). Session 19 (ads) chờ decision gate 6–8 tuần.

**iOS — mở khi nào?** Không đặt lịch cứng. Mở khi có một trong hai tín hiệu: (a) Android có sales tự nhiên và conversion ≥2%, hoặc (b) câu hỏi *"có bản iOS không?"* lặp lại trong group — **đếm những comment này**, đó là demand signal miễn phí. Trade-off cần nhìn thẳng: mẹ bầu thành thị VN dùng iPhone không ít, nên đây là doanh thu chủ động để trên bàn — đổi lấy việc không đốt $99 + effort trước khi app được validate trên Android. Checklist mở iOS nằm cuối admin track; chi phí mở sau rất thấp vì code đã chừa sẵn điểm nối.

**Nhịp tổng thể (giữ nguyên mốc growth plan §9):** báo cáo PDF (Session 13) vẫn là ưu tiên #1 vì nó là "sản phẩm"; paywall live trong tháng đầu sau launch; đo conversion 6–8 tuần rồi mới quyết Session 19 (ads). Kill/pivot criteria §9 giữ nguyên — **đừng nới tiêu chí vì áp lực thu nhập**; tiêu chí tồn tại để bảo vệ thời gian của bạn.

---

## Mapping to SUGAR-GROWTH-PLAN.md + deviations

| Growth plan | Repo session | Deviation / ghi chú |
|---|---|---|
| S13 IAP & Paywall | **Session 15** | Bỏ fake anchor "199k gạch ngang" (rủi ro store + luật quảng cáo) → copy "Giá ra mắt"; giá lấy từ store, không hardcode; thêm dev escape hatch cho Expo Go |
| S14 Gating | **Session 16** | "Biểu đồ nâng cao" được định nghĩa cụ thể = phân tích **Theo bữa**, ship cùng session (không bán vapor); CSV→Pro ghi vào PRD v1.4 |
| S15 Auth | **Session 17** | Google trước, Sign in with Apple defer tới lúc mở iOS; + **xóa tài khoản in-app + web URL** (Play policy, Apple 5.1.1 khi lên iOS) qua Edge Function; region Singapore |
| S16 Backup | **Session 18** | Single-slot latest-only (vừa free tier 1GB); auto-backup on-foreground thay vì background task; E2E encryption deferred có chủ đích |
| S17 Ads | **Session 19** | **Default: SKIP.** Decision gate sau 6–8 tuần conversion data; nếu làm thì non-personalized only |
| S18 ASO | *(đã merge vào Session 14)* | — |
| S19 Launch & review loop | **Session 20** | Review prompt sau report **thứ 1** (lần 2 giờ nằm sau paywall → volume quá nhỏ); + weekly summary notification từ §8.4; + cơ chế "Mã hỗ trợ" để tặng Pro qua RevenueCat granted entitlements |
| S20 Hậu sản + Affiliate | **Session 21** | Postpartum = state (`babyBornAt`) của `gestational`, không phải conditionType mới — đúng branch #4 của mode-switch principle |
| S21 Polish | **Session 22** | Onboarding đã xong ở Session 10; widget defer (native target); còn lại landing page + triage |

---

## Ghi chú thẳng thắn về tiền (đọc 30 giây)

Growth plan §5/§9 tự nói rồi, nhắc lại vì nó quan trọng với hoàn cảnh hiện tại: **sales đầu tiên dự kiến tháng 3–4, mốc 1–3tr/tháng ở tháng 6, 10tr ở tháng 12–18.** Nghĩa là app này là *track chạy song song*, không phải phao thu nhập cho giai đoạn ngay sau layoff. Nếu cần dòng tiền trong 1–3 tháng tới thì việc chính vẫn là tìm việc/freelance — app chạy nền theo đúng nhịp session, và kill-criteria §9 (3 tháng <500 installs hoặc conversion <1.5% → đổi kênh/positioning; 6 tháng <2tr/tháng → maintenance mode) là thứ bảo vệ bạn khỏi đốt thêm thời gian sai chỗ. Điểm sáng: toàn bộ chi phí vận hành giai đoạn đầu ≈ 0đ (RevenueCat free tier, Supabase free tier, Aptabase free tier, GitHub Pages) + $25 Play một lần; $99/năm Apple chỉ phát sinh khi bạn quyết mở iOS — downside được khống chế rất chặt.
