// Generate bus-eta PWA icons (192 / 512) — bus silhouette, SeaCast dark theme
// Run: node make-icons.js
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function makePng(size, pixelFn) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x, y);
      const o = rowStart + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function busIcon(size) {
  const s = size;
  return (x, y) => {
    // dark blue gradient background (#0a1628 -> #0f1c30)
    const t = y / s;
    const bgR = Math.round(10 + 5 * t);
    const bgG = Math.round(22 + 6 * t);
    const bgB = Math.round(40 + 8 * t);

    // Bus body: rounded rect, centered, 62% width, 46% height
    const bx0 = s * 0.19, bx1 = s * 0.81;
    const by0 = s * 0.22, by1 = s * 0.78;
    const radius = s * 0.08;
    const inBody = (px, py) => {
      if (px < bx0 || px > bx1 || py < by0 || py > by1) return false;
      const cx = Math.max(bx0 + radius, Math.min(bx1 - radius, px));
      const cy = Math.max(by0 + radius, Math.min(by1 - radius, py));
      const dx = px - cx, dy = py - cy;
      return dx * dx + dy * dy <= radius * radius;
    };

    // Windows: two rows of light-blue windows on upper half
    const winColor = (px, py) => {
      const winTop = s * 0.28, winBot = s * 0.42;
      if (py < winTop || py > winBot) return null;
      const nWin = 4, gap = s * 0.02;
      const winW = (s * 0.56 - gap * (nWin - 1)) / nWin;
      for (let i = 0; i < nWin; i++) {
        const wx0 = s * 0.22 + i * (winW + gap);
        const wx1 = wx0 + winW;
        if (px >= wx0 && px <= wx1) return [176, 224, 250]; // #b0e0fa
      }
      return null;
    };

    // Wheels: two dark circles near bottom
    const wheel = (cx, cy, r, px, py) => {
      const dx = px - cx, dy = py - cy;
      return dx * dx + dy * dy <= r * r;
    };

    let r = bgR, g = bgG, b = bgB, a = 255;

    if (inBody(x, y)) {
      const wc = winColor(x, y);
      if (wc) { r = wc[0]; g = wc[1]; b = wc[2]; }
      else {
        // teal body with vertical gradient
        const bt = (y - by0) / (by1 - by0);
        r = Math.round(78 - 25 * bt);
        g = Math.round(205 - 55 * bt);
        b = Math.round(196 - 30 * bt);
      }
    }
    // destination sign strip on top of body
    if (x >= s * 0.22 && x <= s * 0.78 && y >= s * 0.245 && y <= s * 0.285) {
      r = 224; g = 160; b = 96; // #e0a060 orange sign
    }
    // wheels (drawn over body)
    const wR = s * 0.055;
    const wy = s * 0.735;
    if (wheel(s * 0.34, wy, wR, x, y) || wheel(s * 0.66, wy, wR, x, y)) {
      r = 18; g = 26; b = 40;
    }
    return [r, g, b, a];
  };
}

const outDir = path.join(__dirname, 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });
for (const size of [192, 512]) {
  const png = makePng(size, busIcon(size));
  const file = path.join(outDir, 'icon-' + size + '.png');
  fs.writeFileSync(file, png);
  console.log('Wrote', file, png.length, 'bytes');
}
