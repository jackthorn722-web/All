// Favicons made at build time from the client's logo with sharp. No logo?
// A letter mark: the business initial on the brand color.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { imagesDir } from '../../lib/client.js';

function letterMark(site, size) {
  const { primary, 'on-primary': fg } = site.theme.tokens;
  const letter = site.business.name.trim()[0].toUpperCase().replace(/[<&>"]/g, '');
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">` +
      `<rect width="100" height="100" rx="22" fill="${primary}"/>` +
      `<text x="50" y="50" dy=".35em" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="62" fill="${fg}">${letter}</text></svg>`,
  );
}

// Square PNG. `solid` fills transparency (iOS shows transparent icons on black).
export async function iconPng(site, size, { solid = false } = {}) {
  const logo = site.images.logo && path.join(imagesDir(site.slug), site.images.logo);
  const bg = solid ? site.theme.tokens.bg : { r: 0, g: 0, b: 0, alpha: 0 };
  if (!logo || !fs.existsSync(logo)) return sharp(letterMark(site, size)).png().toBuffer();
  const pad = solid ? Math.round(size * 0.12) : 0;
  const img = sharp(logo, { density: 300 })
    .rotate()
    .resize(size - pad * 2, size - pad * 2, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } });
  return (solid ? img.flatten({ background: bg }) : img).png().toBuffer();
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
