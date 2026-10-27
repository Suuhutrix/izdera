/**
 * Bağımlılıksız PNG ikon üreticisi.
 * LogoMark geometrisini (64×64 birim) mesafe fonksiyonlarıyla rasterize eder,
 * 4×4 süper örnekleme ile kenar yumuşatma uygular ve PNG'yi zlib ile kodlar.
 *
 * Çalıştır: npm run icons
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const BG = [0x0f, 0x11, 0x17];
const ACCENT = [0xf0, 0xb6, 0x5c];

// --- Şekiller (64 birimlik tuval) ---
const dots = [
  { x: 12, y: 52, r: 2.4, a: 0.45 },
  { x: 19, y: 46, r: 2.9, a: 0.7 },
  { x: 26.5, y: 40.5, r: 3.4, a: 0.92 },
];
const ring = { x: 40, y: 27, r: 10.5, w: 4.6 };

function roundedRectInside(px, py, size, radius) {
  const h = size / 2;
  const qx = Math.abs(px - h) - (h - radius);
  const qy = Math.abs(py - h) - (h - radius);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const inside = Math.min(Math.max(qx, qy), 0);
  return outside + inside - radius <= 0;
}

/** Bir örnek noktasının rengini (RGBA, 0-1) hesaplar. */
function sample(px, py, { background, radius }) {
  let r = 0, g = 0, b = 0, a = 0;
  const over = (rgb, alpha) => {
    // "source-over" birleştirme (premultiplied değil, basit karışım)
    const outA = alpha + a * (1 - alpha);
    if (outA === 0) return;
    r = (rgb[0] * alpha + r * a * (1 - alpha)) / outA;
    g = (rgb[1] * alpha + g * a * (1 - alpha)) / outA;
    b = (rgb[2] * alpha + b * a * (1 - alpha)) / outA;
    a = outA;
  };
  if (background && roundedRectInside(px, py, 64, radius)) over(BG, 1);
  for (const d of dots) if (Math.hypot(px - d.x, py - d.y) <= d.r) over(ACCENT, d.a);
  if (Math.abs(Math.hypot(px - ring.x, py - ring.y) - ring.r) <= ring.w / 2) over(ACCENT, 1);
  return [r, g, b, a];
}

function render(size, opts) {
  const SS = 4;
  const px = Buffer.alloc(size * size * 4);
  // Maskable/PWA ikonlarında işareti biraz küçült (güvenli alan):
  // işaret koordinatı = (tuval - 32) * inset + 32
  const inset = opts.inset ?? 1;
  const scale = (64 / size) * inset;
  const offset = 32 - 32 * inset;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const ux = (x + (sx + 0.5) / SS) * (64 / size);
          const uy = (y + (sy + 0.5) / SS) * (64 / size);
          // Arka plan tam tuvali kaplar; işaret inset ile ölçeklenir
          const bgS = opts.background && roundedRectInside(ux, uy, 64, opts.radius) ? 1 : 0;
          const mx = (x + (sx + 0.5) / SS) * scale + offset;
          const my = (y + (sy + 0.5) / SS) * scale + offset;
          const [cr, cg, cb, ca] = sample(mx, my, { background: false, radius: opts.radius });
          // Arka plan + işaret birleşimi
          const outA = ca + bgS * (1 - ca);
          const mix = (c, bgc) => (outA ? (c * ca + bgc * bgS * (1 - ca)) / outA : 0);
          r += mix(cr, BG[0]) * outA;
          g += mix(cg, BG[1]) * outA;
          b += mix(cb, BG[2]) * outA;
          a += outA;
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      const alpha = a / n;
      px[i] = alpha ? Math.round(r / a) : 0;
      px[i + 1] = alpha ? Math.round(g / a) : 0;
      px[i + 2] = alpha ? Math.round(b / a) : 0;
      px[i + 3] = Math.round(alpha * 255);
    }
  }
  return px;
}

// --- PNG kodlayıcı ---
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit derinliği
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filtre: yok
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function write(file, size, opts) {
  const out = join(root, file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, encodePng(size, render(size, opts)));
  console.log(`✓ ${file} (${size}×${size})`);
}

const appIcon = { background: true, radius: 14 };
for (const s of [16, 32, 48, 128]) write(`extension/icons/icon-${s}.png`, s, appIcon);
write("public/icon-192.png", 192, { background: true, radius: 0, inset: 1.25 });
write("public/icon-512.png", 512, { background: true, radius: 0, inset: 1.25 });
write("app/apple-icon.png", 180, { background: true, radius: 0, inset: 1.15 });
