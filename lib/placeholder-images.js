// Generates labeled placeholder photos so a brand-new client builds right
// away. They are phone-camera sized (4032x3024) on purpose: the build has to
// shrink them like real client photos. `check` flags every one of them.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export async function makePlaceholder(file, { label, colors = ['#1f2937', '#4b5563'], width = 4032, height = 3024 }) {
  const [a, b] = colors;
  const fontSize = Math.round(width / 18);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <circle cx="${width * 0.78}" cy="${height * 0.28}" r="${height * 0.42}" fill="#ffffff" fill-opacity="0.06"/>
  <text x="50%" y="46%" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${fontSize}" fill="#ffffff" fill-opacity="0.9">PLACEHOLDER</text>
  <text x="50%" y="58%" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(fontSize * 0.55)}" fill="#ffffff" fill-opacity="0.75">${label}</text>
</svg>`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp(Buffer.from(svg)).jpeg({ quality: 80, mozjpeg: true }).toFile(file);
}

// Makes every placeholder-*.jpg a site.json refers to that does not exist yet.
export async function makeMissingPlaceholders(spec, dir, colors) {
  const files = [...JSON.stringify(spec).matchAll(/"(placeholder-[\w-]+\.jpg)"/g)].map((m) => m[1]);
  const made = [];
  for (const name of new Set(files)) {
    const file = path.join(dir, name);
    if (fs.existsSync(file)) continue;
    const label = name.replace(/^placeholder-|\.jpg$/g, '').replace(/-/g, ' ') + ' photo: replace me';
    await makePlaceholder(file, { label, colors });
    made.push(name);
  }
  return made;
}
