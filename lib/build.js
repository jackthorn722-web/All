// Builds one client into dist/<slug>/ (used by `npm run build` and `deploy`).
// The build goes to a temp folder that replaces dist/<slug>/ only when it
// succeeds, so a failed build never leaves a half-finished site behind.
import fs from 'node:fs';
import path from 'node:path';
import { fail, green, dim, bold } from './cli.js';

const REQUIRED = ['index.html', '404.html', 'sitemap.xml', 'robots.txt', 'favicon.ico', 'icon-192.png', 'apple-touch-icon.png', '_headers'];

// siteUrl: override the public URL (deploy knows the real *.pages.dev name).
// preview: a build for client approval: noindex everywhere.
export async function buildSite(slug, { siteUrl, preview = false } = {}) {
  process.env.CLIENT_SLUG = slug;
  if (siteUrl) process.env.DIALEDIN_SITE_URL = siteUrl;
  else delete process.env.DIALEDIN_SITE_URL;
  if (preview) process.env.DIALEDIN_PREVIEW = '1';
  else delete process.env.DIALEDIN_PREVIEW;

  const out = path.join('dist', slug);
  const tmp = path.join('dist', `.building-${slug}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  const { build } = await import('astro');
  try {
    await build({ root: process.cwd(), outDir: tmp, logLevel: 'warn' });
  } catch (e) {
    fs.rmSync(tmp, { recursive: true, force: true });
    fail(`Build failed; ${out}${path.sep} was left as it was.\n${e.message}`);
  }
  const missing = REQUIRED.filter((f) => !fs.existsSync(path.join(tmp, f)));
  if (missing.length) {
    fs.rmSync(tmp, { recursive: true, force: true });
    fail(`Build output is missing ${missing.join(', ')}; ${out}${path.sep} was left as it was.`);
  }
  swapIn(slug, tmp, out);
  return out;
}

export function printSummary(out) {
  const files = fs.readdirSync(out, { recursive: true, withFileTypes: true }).filter((d) => d.isFile());
  const size = (f) => fs.statSync(path.join(f.parentPath, f.name)).size;
  const images = files.filter((f) => /\.(webp|avif|jpe?g|png|gif|svg)$/i.test(f.name) && f.parentPath.includes('_astro'));
  const kb = (n) => `${Math.round(n / 1024)} KB`;
  console.log(green(`\nBuilt ${bold(out + path.sep)}`));
  console.log(dim(`  ${files.length} files, ${kb(files.reduce((t, f) => t + size(f), 0))} total`));
  console.log(dim(`  index.html ${kb(fs.statSync(path.join(out, 'index.html')).size)}, ${images.length} optimized images (${kb(images.reduce((t, f) => t + size(f), 0))})`));
}

// Replace dist/<slug>/ with the new build. Renames first (retrying while
// Windows Explorer or antivirus briefly holds a file), deletes the old copy
// last, and puts the old site back if the swap cannot finish.
function swapIn(slug, from, to) {
  const old = path.join('dist', `.old-${slug}`);
  const retry = (fn) => {
    for (let i = 0; ; i++) {
      try {
        return fn();
      } catch (e) {
        if (i >= 10 || !['EPERM', 'EBUSY', 'EACCES', 'ENOTEMPTY'].includes(e.code)) throw e;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
      }
    }
  };
  fs.rmSync(old, { recursive: true, force: true, maxRetries: 5 });
  try {
    if (fs.existsSync(to)) retry(() => fs.renameSync(to, old));
    retry(() => fs.renameSync(from, to));
  } catch (e) {
    if (!fs.existsSync(to) && fs.existsSync(old)) fs.renameSync(old, to);
    fail(`Could not replace ${to}${path.sep} (${e.code}). Close anything using that folder and run the build again.`);
  }
  try {
    fs.rmSync(old, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch {
    console.log(dim(`(Could not delete ${old}${path.sep}; it is safe to delete by hand.)`));
  }
}
