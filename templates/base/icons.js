// Favicons made at build time from the client's logo with sharp. No logo, or a
// wide wordmark? A letter mark: the business initial on the brand color.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { imagesDir } from '../../lib/client.js';
import { contrast } from '../../lib/colors.js';

// `square` for iOS, which rounds the corners itself and shows transparency as black.
function letterMark(site, size, square = false) {
  const { primary, 'on-primary': fg } = site.theme.tokens;
  const letter = site.business.name.trim()[0].toUpperCase().replace(/[<&>"]/g, '');
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">` +
      `<rect width="100" height="100" rx="${square ? 0 : 22}" fill="${primary}"/>` +
      `<text x="50" y="50" dy=".35em" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="62" fill="${fg}">${letter}</text></svg>`,
  );
}

// Mean color of the logo's visible pixels, and its aspect ratio.
async function logoInfo(file) {
  const { data, info } = await sharp(file, { density: 72 }).rotate().resize(64, 64, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const sum = [0, 0, 0];
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    sum[0] += data[i];
    sum[1] += data[i + 1];
    sum[2] += data[i + 2];
    n++;
  }
  const hex = '#' + sum.map((v) => Math.round(v / Math.max(n, 1)).toString(16).padStart(2, '0')).join('');
  return { color: hex, aspect: info.width / info.height };
}

// Square PNG from the logo, or the letter mark when there is no logo or the
// logo is too wide/tall to read at favicon size. `solid` fills transparency
// (iOS shows transparent icons on black) with whichever of the page color,
// white or black stands out most against the logo.
export async function iconPng(site, size, { solid = false } = {}) {
  const logo = site.images.logo && path.join(imagesDir(site.slug), site.images.logo);
  const mark = () => sharp(letterMark(site, size, solid)).png().toBuffer();
  if (!logo || !fs.existsSync(logo)) return mark();
  const { color, aspect } = await logoInfo(logo);
  if (aspect > 1.3 || aspect < 1 / 1.3) return mark();
  const clear = { r: 0, g: 0, b: 0, alpha: 0 };
  const bg = solid ? [site.theme.tokens.bg, '#ffffff', '#0b0b0f'].sort((a, b) => contrast(b, color) - contrast(a, color))[0] : clear;
  const pad = solid ? Math.round(size * 0.12) : 0;
  // Flatten the logo's own transparency first, then letterbox/pad with the same color.
  let img = sharp(logo, { density: 300 }).rotate();
  if (solid) img = sharp(await img.flatten({ background: bg }).png().toBuffer());
  return img
    .resize(size - pad * 2, size - pad * 2, { fit: 'contain', background: bg })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: bg })
    .png()
    .toBuffer();
}

// .ico that wraps one 32x32 PNG (supported by every current browser).
export async function faviconIco(site) {
  const png = await iconPng(site, 32);
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  header.writeUInt8(32, 6); // width
  header.writeUInt8(32, 7); // height
  header.writeUInt8(0, 8); // palette
  header.writeUInt8(0, 9); // reserved
  header.writeUInt16LE(1, 10); // color planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(png.length, 14); // image size
  header.writeUInt32LE(22, 18); // image offset
  return Buffer.concat([header, png]);
}
