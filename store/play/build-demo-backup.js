#!/usr/bin/env node
/**
 * Sinh file backup dữ liệu MẪU để dựng cảnh chụp screenshot Play Store.
 *
 *   node store/play/build-demo-backup.js
 *
 * Ra:
 *   store/play/.tmp/sugar-demo-backup.json
 *
 * Vì sao đi đường backup: màn Trends/Báo cáo cần ~4 tuần dữ liệu mới ra hình đẹp, nhập tay là
 * ~100 lần. `applyBackup` (src/domain/use-cases/apply-backup.ts) thay thế TOÀN BỘ readings +
 * settings, nên một file JSON dựng sẵn set-up được cả dữ liệu lẫn giao diện (Thai kỳ / tiếng Việt /
 * mmol-L / ngày dự sinh / nhắc đo) trong một lần Khôi phục.
 *
 * ⚠️ Khôi phục XOÁ SẠCH dữ liệu đang có trên máy. Bấm Sao lưu giữ dữ liệu thật trước đã.
 *
 * Shape phải khớp `BackupFile` (src/domain/models/backup.ts) và mọi reading phải qua được
 * `isValidReading` — value là INTEGER mg/dL (mmol/L chỉ là cách hiển thị).
 */
const fs = require('fs');
const path = require('path');

const TMP = path.join(__dirname, '.tmp');
fs.mkdirSync(TMP, { recursive: true });

const DAYS = 28;

/**
 * Ngôn ngữ của bộ ảnh sắp chụp: `--lang en` (mặc định, listing en-US) hoặc `--lang vi`.
 * Nhãn nhắc đo hiện nguyên văn trên màn Nhắc đo, nên nhãn tiếng Việt nằm giữa màn tiếng Anh
 * là lộ ngay trong ảnh store.
 */
const LANG = process.argv.includes('--lang')
  ? process.argv[process.argv.indexOf('--lang') + 1]
  : 'en';
if (LANG !== 'en' && LANG !== 'vi') {
  console.error(`--lang chỉ nhận "en" hoặc "vi", nhận được: ${LANG}`);
  process.exit(1);
}

const REMINDER_LABELS = {
  en: ['Fasting check', 'After lunch', 'Before bed'],
  vi: ['Đo lúc đói', 'Sau bữa trưa', 'Trước khi ngủ'],
};

/** Ngưỡng thai kỳ — phải khớp CONDITION_PRESETS.gestational trong src/domain/models/condition.ts. */
const FASTING = { low: 70, high: 95 };
const POST_MEAL = { low: 70, high: 140 };
const POST_MEAL_2H = { low: 70, high: 120 };

/** LCG có seed: chạy lại ra y hệt (Math.random trần sẽ đổi dữ liệu mỗi lần chạy). */
let seed = 20260801;
function rand() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
const randInt = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

/**
 * 4 lần đo/ngày theo nhịp thai kỳ: đói trước sáng, rồi 1h sau mỗi bữa.
 * `pHigh` = xác suất lần đo đó vượt ngưỡng; `pSkip` = xác suất bỏ lần đo (cho giống người thật).
 */
const SLOTS = [
  { hour: 6, mealType: 'Breakfast', mealTiming: 'Before', lo: 79, hi: 92, hiLo: 97, hiHi: 103, pHigh: 0.05, pSkip: 0.04 },
  { hour: 8, mealType: 'Breakfast', mealTiming: 'After', lo: 105, hi: 133, hiLo: 145, hiHi: 162, pHigh: 0.1, pSkip: 0.08 },
  { hour: 13, mealType: 'Lunch', mealTiming: 'After', lo: 108, hi: 136, hiLo: 146, hiHi: 168, pHigh: 0.12, pSkip: 0.1 },
  { hour: 19, mealType: 'Dinner', mealTiming: 'After', lo: 106, hi: 134, hiLo: 145, hiHi: 160, pHigh: 0.09, pSkip: 0.12 },
];

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const startOfDay = (offsetDays) => {
  const d = new Date(today);
  d.setDate(d.getDate() - offsetDays);
  return d;
};

const readings = [];
let n = 0;

for (let back = DAYS - 1; back >= 0; back -= 1) {
  const day = startOfDay(back);
  const isToday = back === 0;

  for (const slot of SLOTS) {
    // Hôm nay chỉ có các lần đo đã tới giờ — màn "Hôm nay" phải trông như một ngày đang diễn ra,
    // còn slot chưa tới giờ thì để trống.
    if (isToday && slot.hour > now.getHours()) continue;
    if (!isToday && rand() < slot.pSkip) continue;

    const high = rand() < slot.pHigh;
    const value = high ? randInt(slot.hiLo, slot.hiHi) : randInt(slot.lo, slot.hi);

    const recordedAt = new Date(day);
    recordedAt.setHours(slot.hour, randInt(0, 25), 0, 0);
    const ts = recordedAt.getTime();

    n += 1;
    readings.push({
      id: `demo-${String(n).padStart(3, '0')}`,
      value,
      mealType: slot.mealType,
      mealTiming: slot.mealTiming,
      ...(slot.mealTiming === 'After' ? { hoursAfterMeal: 1 } : {}),
      recordedAt: ts,
      createdAt: ts + randInt(30, 240) * 1000, // ghi vào app vài chục giây sau khi đo
      updatedAt: ts + randInt(30, 240) * 1000,
      syncStatus: 'pending',
    });
  }
}

/** Ngày dự sinh: hôm nay + 70 ngày ⇒ màn Hôm nay hiện "Tuần 30 · còn 70 ngày". */
const dueDate = startOfDay(-70).getTime();

const settings = {
  preferredUnit: 'mmol/L',
  preferredLanguage: LANG,
  fastingRange: FASTING,
  postMealRange: POST_MEAL,
  alertsEnabled: true,
  onboardingDone: true,
  conditionType: 'gestational',
  dueDate,
  afterMealProtocol: '1h',
  postMeal2hRange: POST_MEAL_2H,
  manualReminders: [
    { id: 'demo-r1', label: REMINDER_LABELS[LANG][0], time: '06:30', enabled: true, repeat: 'daily' },
    { id: 'demo-r2', label: REMINDER_LABELS[LANG][1], time: '13:00', enabled: true, repeat: 'daily' },
    { id: 'demo-r3', label: REMINDER_LABELS[LANG][2], time: '21:30', enabled: true, repeat: 'daily' },
  ],
  smartAfterMeal: { enabled: true, offset: '1h' },
  reportCount: 3,
  analyticsEnabled: true,
  lastLocalBackupAt: null,
  reviewAskedAt: null,
  supportCode: null,
  babyBornAt: null,
  postpartumPromptSnoozedAt: null,
  ogttDoneAt: null,
};

const backup = { app: 'sugar', schemaVersion: 1, exportedAt: Date.now(), readings, settings };

const out = path.join(TMP, 'sugar-demo-backup.json');
fs.writeFileSync(out, JSON.stringify(backup, null, 2));

// --- Tự kiểm: con số phải khớp cái sẽ hiện trên màn hình lúc chụp ---
const inRange = readings.filter((r) => {
  const range = r.mealTiming === 'Before' ? FASTING : POST_MEAL;
  return r.value >= range.low && r.value <= range.high;
}).length;
const pct = Math.round((inRange / readings.length) * 100);
const mmol = (v) => (v * 0.0555).toFixed(1);
const first = readings[0];
const last = readings[readings.length - 1];

console.log(out);
console.log(`  ${readings.length} chỉ số / ${DAYS} ngày · ${pct}% trong ngưỡng (${readings.length - inRange} điểm cao)`);
console.log(`  ${new Date(first.recordedAt).toLocaleString('vi-VN')} → ${new Date(last.recordedAt).toLocaleString('vi-VN')}`);
console.log(`  ngày dự sinh ${new Date(dueDate).toLocaleDateString('vi-VN')} · giá trị ${mmol(Math.min(...readings.map((r) => r.value)))}–${mmol(Math.max(...readings.map((r) => r.value)))} mmol/L`);
