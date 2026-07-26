#!/usr/bin/env node
/**
 * Sinh đồ hoạ cho Play Store listing từ chính token brand của app.
 *
 *   node store/play/build-graphics.js
 *
 * Ra:
 *   store/play/icon-512.png                 — 512×512, full-bleed, KHÔNG alpha (Play cấm trong suốt)
 *   store/play/.tmp/feature-graphic.html    — nguồn HTML để chụp (xem README, bước 2)
 *
 * Vì sao icon không đi qua trình duyệt: Chrome ghi screenshot theo profile màn hình (P3),
 * làm #0FA36B ra #4BA170. Icon được composite bằng zlib thuần ở đây nên màu chính xác tuyệt đối.
 * Feature graphic thì cần trình duyệt (chữ + font), nên phải chuyển sRGB sau khi chụp — README.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const REPO = path.resolve(__dirname, '../..');
const OUT = __dirname;
const TMP = path.join(OUT, '.tmp');
fs.mkdirSync(TMP, { recursive: true });

/** Brand Evergreen — phải khớp `evergreen.brand` trong src/ui/theme/colors.ts. */
const BRAND = [0x0f, 0xa3, 0x6b];
const BRAND_HEX = '#0FA36B';

// ---------------------------------------------------------------- PNG tối thiểu

function decodePng(file) {
  const buf = fs.readFileSync(file);
  let pos = 8;
  let w, h, colorType;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      colorType = data[9];
      if (data[8] !== 8 || (colorType !== 6 && colorType !== 2)) {
        throw new Error(`chỉ hỗ trợ PNG 8-bit RGB/RGBA (depth=${data[8]} colorType=${colorType})`);
      }
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const bpp = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const out = Buffer.alloc(w * h * bpp);
  let rp = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[rp++];
    const line = raw.subarray(rp, rp + stride);
    rp += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 0xff;
    }
  }
  return { w, h, bpp, data: out };
}

let CRC_TABLE = null;
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

function encodeRgbPng({ w, h, data }) {
  const stride = w * 3;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const chunk = (type, payload) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(payload.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), payload]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // truecolour, không alpha
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- icon 512 full-bleed

const SRC_ICON = path.join(REPO, 'assets/images/icon.png');
const src = decodePng(SRC_ICON);
const N = 512;
const k = src.w / N;
if (!Number.isInteger(k)) throw new Error(`icon ${src.w}px không chia hết cho ${N}`);
const icon = Buffer.alloc(N * N * 3);
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    let n = 0;
    for (let dy = 0; dy < k; dy++) {
      for (let dx = 0; dx < k; dx++) {
        const i = ((y * k + dy) * src.w + (x * k + dx)) * src.bpp;
        const al = src.bpp === 4 ? src.data[i + 3] / 255 : 1;
        r += src.data[i] * al;
        g += src.data[i + 1] * al;
        b += src.data[i + 2] * al;
        a += al;
        n++;
      }
    }
    const cov = a / n; // độ phủ trung bình của ô nguồn
    const o = (y * N + x) * 3;
    const mix = (sum, bg) => Math.round((a ? sum / a : 0) * cov + bg * (1 - cov));
    icon[o] = mix(r, BRAND[0]);
    icon[o + 1] = mix(g, BRAND[1]);
    icon[o + 2] = mix(b, BRAND[2]);
  }
}
fs.writeFileSync(path.join(OUT, 'icon-512.png'), encodeRgbPng({ w: N, h: N, data: icon }));

// ---------------------------------------------------------------- feature graphic (HTML)

const b64 = (p) => fs.readFileSync(p).toString('base64');
const iconB64 = b64(SRC_ICON);
const fontDir = path.join(REPO, 'node_modules/@expo-google-fonts/nunito');
const font = (w, name) =>
  `@font-face{font-family:'Nunito';font-weight:${w};src:url(data:font/ttf;base64,${b64(
    path.join(fontDir, `${name}/Nunito_${name}.ttf`)
  )}) format('truetype')}`;

// Nội dung nằm giữa: Play crop mép ở một số layout.
const html = `<meta charset="utf-8"><title>Sugar feature graphic</title><style>
${font(400, '400Regular')}
${font(600, '600SemiBold')}
${font(800, '800ExtraBold')}
html,body{margin:0;padding:0;background:#fff}
#fg{width:1024px;height:500px;position:relative;overflow:hidden;font-family:'Nunito',sans-serif;
  background:linear-gradient(135deg,#0E8F5E 0%,${BRAND_HEX} 55%,#12B478 100%);
  display:flex;flex-direction:column;justify-content:center;align-items:center;
  gap:40px;padding:0 88px;box-sizing:border-box}
#fg::before{content:'';position:absolute;width:620px;height:620px;border-radius:50%;
  right:-160px;top:-220px;background:rgba(255,255,255,.10)}
#fg::after{content:'';position:absolute;width:420px;height:420px;border-radius:50%;
  right:60px;bottom:-240px;background:rgba(255,255,255,.07)}
.head{display:flex;align-items:center;gap:40px;position:relative;z-index:1}
/* khung trắng: icon cũng nền xanh nên không có khung sẽ chìm vào gradient */
.mark{width:176px;height:176px;border-radius:44px;flex:0 0 auto;background:#fff;
  display:grid;place-items:center;box-shadow:0 18px 40px rgba(10,60,40,.28)}
.mark img{width:132px;height:132px;display:block;border-radius:30px}
h1{margin:0;font-weight:800;font-size:92px;line-height:1;color:#fff;letter-spacing:-1px}
p{margin:12px 0 0;font-weight:600;font-size:36px;line-height:1.2;color:rgba(255,255,255,.94)}
ul{margin:0;padding:0;list-style:none;display:flex;gap:14px;flex-wrap:nowrap;position:relative;z-index:1}
li{font-weight:600;font-size:24px;color:#0A7350;background:#fff;padding:13px 24px;
  border-radius:999px;white-space:nowrap}
</style>
<div id="fg">
  <div class="head">
    <div class="mark"><img src="data:image/png;base64,${iconB64}"></div>
    <div><h1>Sugar</h1><p>Sổ tiểu đường thai kỳ</p></div>
  </div>
  <ul><li>Ghi 2 chạm</li><li>Nhắc đo sau ăn</li><li>Xuất báo cáo cho bác sĩ</li></ul>
</div>`;
fs.writeFileSync(path.join(TMP, 'feature-graphic.html'), html);

console.log('icon-512.png (512×512, không alpha, nền ' + BRAND_HEX + ')');
console.log('.tmp/feature-graphic.html — chụp theo README bước 2');
