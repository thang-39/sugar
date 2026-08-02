#!/usr/bin/env node
/**
 * Sinh nguồn HTML cho ảnh OG của landing page (docs/og.png, 1200×630).
 *
 *   node docs/build-og.js
 *   # rồi chụp bằng harness trình duyệt (xem cuối file này)
 *
 * Bản đầu (Session 22) render từ SVG qua `qlmanage`, nên chữ rơi vào font hệ thống
 * macOS (Helvetica Neue) — lệch brand. Bản này nhúng thẳng Nunito từ node_modules
 * dưới dạng data-URI nên chữ khớp app, và không phụ thuộc font cài trên máy.
 *
 * Bảng màu Rose lấy từ `roseScheme` trong src/ui/theme/colors.ts.
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const TMP = path.join(REPO, 'docs/.tmp');
fs.mkdirSync(TMP, { recursive: true });

const fontDir = path.join(REPO, 'node_modules/@expo-google-fonts/nunito');
const font = (weight, name) =>
  `@font-face{font-family:'Nunito';font-weight:${weight};font-style:normal;src:url(data:font/ttf;base64,${fs
    .readFileSync(path.join(fontDir, `${name}/Nunito_${name}.ttf`))
    .toString('base64')}) format('truetype')}`;

const html = `<meta charset="utf-8"><title>Sugar — OG image</title><style>
${font(800, '800ExtraBold')}
${font(900, '900Black')}
html,body{margin:0;padding:0;background:#fff}
#og{width:1200px;height:630px;position:relative;overflow:hidden;box-sizing:border-box;
  font-family:'Nunito',sans-serif;
  background:radial-gradient(120% 90% at 18% 8%, #3B0F2B 0%, #2A0A1E 45%, #1A0512 100%)}
/* dải ngưỡng mục tiêu */
.band{position:absolute;left:0;right:0;top:295px;height:135px;background:rgba(244,143,177,.07);
  border-top:1px dashed rgba(244,143,177,.35);border-bottom:1px dashed rgba(244,143,177,.35)}
.copy{position:absolute;left:80px;top:88px}
.kicker{font-weight:900;font-size:26px;letter-spacing:.22em;color:rgba(244,143,177,.62)}
h1{margin:14px 0 0;font-weight:900;font-size:82px;line-height:1.06;letter-spacing:-.02em;color:#FDF3F8}
h1 .rose{color:#F48FB1}
svg{position:absolute;inset:0}
.pill{position:absolute;left:80px;bottom:58px;display:flex;align-items:center;gap:12px;
  background:rgba(255,255,255,.08);border-radius:999px;padding:14px 26px}
.dot{width:13px;height:13px;border-radius:50%;background:#4ADE9B}
.pill span{font-weight:900;font-size:22px;letter-spacing:.14em;color:#4ADE9B}
</style>
<div id="og">
  <div class="band"></div>
  <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none">
    <defs>
      <linearGradient id="line" x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity=".85"/>
        <stop offset=".55" stop-color="#F48FB1"/>
        <stop offset="1" stop-color="#EC5F92"/>
      </linearGradient>
      <filter id="glow" x="-20%" y="-200%" width="140%" height="500%">
        <feGaussianBlur stdDeviation="9" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <path d="M-10 378 C 150 372, 210 342, 340 348 S 520 372, 640 356 S 830 396, 960 388 S 1120 356, 1210 352"
      stroke="url(#line)" stroke-width="7" stroke-linecap="round" filter="url(#glow)"/>
    <circle cx="1181" cy="353" r="11" fill="#FFFFFF" filter="url(#glow)"/>
  </svg>
  <div class="copy">
    <div class="kicker">SUGAR</div>
    <h1>40 weeks.<br><span class="rose">One steady line.</span></h1>
  </div>
  <div class="pill"><i class="dot"></i><span>IN RANGE</span></div>
</div>`;

fs.writeFileSync(path.join(TMP, 'og.html'), html);
console.log('docs/.tmp/og.html — chụp bằng:');
console.log(`
  .claude-tools/browser/run.sh launch
  .claude-tools/browser/run.sh exec "
    await page.goto('file://\\$PWD/docs/.tmp/og.html');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    await page.locator('#og').screenshot({path:'docs/.tmp/og-2x.png'});
  "
  # Chrome chụp DPR 2 và ghi theo profile màn hình (P3) → hạ về 1200×630 VÀ ép sRGB:
  sips -z 630 1200 --matchTo "/System/Library/ColorSync/Profiles/sRGB Profile.icc" \\
    docs/.tmp/og-2x.png --out docs/og.png
`);
