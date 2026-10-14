// Generates PNG icons for the extension using only the Node stdlib (zlib + a tiny PNG encoder).
// No external deps. Produces a green leaf-ish mark on a rounded dark tile.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function png(rgba, w, h) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  // add filter byte per row
  const raw = Buffer.alloc((w * 4 + 1) * h);
  let p = 0;
  for (let y = 0; y < h; y++) {
    raw[p++] = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      raw[p++] = rgba[i];
      raw[p++] = rgba[i + 1];
      raw[p++] = rgba[i + 2];
      raw[p++] = rgba[i + 3];
    }
  }
  const idat = deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function lerp(a, b, t) { return a + (b - a) * t; }

function makeIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // rounded tile background
      if (dist <= r - 1) {
        // vertical gradient dark green -> teal
        const t = y / size;
        const rr = Math.round(lerp(7, 6, t));
        const gg = Math.round(lerp(94, 78, t));
        const bb = Math.round(lerp(53, 60, t));
        rgba[i] = rr; rgba[i + 1] = gg; rgba[i + 2] = bb; rgba[i + 3] = 255;
      } else {
        rgba[i] = 0; rgba[i + 1] = 0; rgba[i + 2] = 0; rgba[i + 3] = 0;
      }
    }
  }
  // draw a simple leaf shape using two ellipses
  const leafW = size * 0.18;
  const leafH = size * 0.42;
  const angle = -Math.PI / 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > r - 1) continue;
      // rotate point around center
      const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
      const ry = dx * Math.sin(angle) + dy * Math.cos(angle);
      // leaf: ellipse centered slightly up-left
      const ex = rx + size * 0.02;
      const ey = ry + size * 0.05;
      const inLeaf = (ex * ex) / (leafW * leafW) + (ey * ey) / (leafH * leafH) <= 1;
      if (inLeaf) {
        // bright green leaf with a subtle vein
        rgba[i] = 134; rgba[i + 1] = 239; rgba[i + 2] = 172; rgba[i + 3] = 255;
        // central vein darker
        if (Math.abs(ey) < size * 0.012) {
          rgba[i] = 22; rgba[i + 1] = 101; rgba[i + 2] = 52; rgba[i + 3] = 255;
        }
      }
    }
  }
  return png(rgba, size, size);
}

for (const s of [16, 32, 48, 128]) {
  writeFileSync(resolve(outDir, `icon${s}.png`), makeIcon(s));
  console.log(`wrote icon${s}.png`);
}
