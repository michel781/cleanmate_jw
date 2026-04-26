// Generate solid rounded-square PNG placeholder icons (no font / no deps).
// Run: node scripts/gen-icons.mjs
//
// Produces public/icons/icon-{192,512}.png in CleanMate brand color (#D4824A).
// Replace with proper designed icons before shipping to production.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'public', 'icons');

// Brand color
const FG = [0xD4, 0x82, 0x4A]; // #D4824A
const RADIUS_RATIO = 0.225;    // matches iOS rounded square

// --- CRC32 ---
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : (c >>> 1);
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makeRoundedSquarePng(size) {
  const r = Math.round(size * RADIUS_RATIO);
  // Inset rectangle (axis-aligned core where every pixel is opaque)
  const x0 = r, x1 = size - 1 - r;
  const y0 = r, y1 = size - 1 - r;
  const r2 = r * r;

  // Build raw RGBA scanlines, prefixed with filter byte 0 (None).
  const stride = 1 + size * 4;
  const raw = Buffer.alloc(stride * size);
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter
    for (let x = 0; x < size; x++) {
      let inside = true;
      // If outside the inset rectangle, check distance to the nearest corner center.
      if (x < x0 || x > x1 || y < y0 || y > y1) {
        const cx = x < x0 ? x0 : x > x1 ? x1 : x;
        const cy = y < y0 ? y0 : y > y1 ? y1 : y;
        const dx = x - cx;
        const dy = y - cy;
        inside = dx * dx + dy * dy <= r2;
      }
      if (inside) {
        raw[p++] = FG[0];
        raw[p++] = FG[1];
        raw[p++] = FG[2];
        raw[p++] = 0xff;
      } else {
        raw[p++] = 0;
        raw[p++] = 0;
        raw[p++] = 0;
        raw[p++] = 0;
      }
    }
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);  // width
  ihdr.writeUInt32BE(size, 4);  // height
  ihdr[8] = 8;                  // bit depth
  ihdr[9] = 6;                  // color type RGBA
  ihdr[10] = 0;                 // compression
  ihdr[11] = 0;                 // filter
  ihdr[12] = 0;                 // interlace
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of [192, 512]) {
  const out = resolve(OUT_DIR, `icon-${size}.png`);
  writeFileSync(out, makeRoundedSquarePng(size));
  console.log(`wrote ${out} (${size}x${size})`);
}
