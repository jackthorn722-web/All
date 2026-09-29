// npm run build -- <slug>
// Static site in dist/<slug>/. Errors block; placeholders only warn
// (deploy --prod will refuse them). Prints what was produced.
import fs from 'node:fs';
import path from 'node:path';
import { enterRepoRoot, slugArgs, validateAndReport, fail, green, dim, bold } from '../lib/cli.js';

enterRepoRoot();
const { slug } = slugArgs('build');
const { errors } = validateAndReport(slug, { full: false });
if (errors.length) process.exit(1);

process.env.CLIENT_SLUG = slug;
const out = path.join('dist', slug);
fs.rmSync(out, { recursive: true, force: true });
const { build } = await import('astro');
await build({ root: process.cwd(), logLevel: 'warn' });

// Confirm the output has everything a site needs.
const required = ['index.html', '404.html', 'sitemap.xml', 'robots.txt', 'favicon.ico', 'icon-192.png', 'apple-touch-icon.png'];
const missing = required.filter((f) => !fs.existsSync(path.join(out, f)));
if (missing.length) fail(`Build finished but ${out} is missing: ${missing.join(', ')}`);

const files = fs.readdirSync(out, { recursive: true, withFileTypes: true }).filter((d) => d.isFile());
const size = (f) => fs.statSync(path.join(f.parentPath, f.name)).size;
const images = files.filter((f) => /\.(webp|avif|jpe?g|png)$/i.test(f.name) && f.parentPath.includes('_astro'));
const kb = (n) => `${Math.round(n / 1024)} KB`;
console.log(green(`\nBuilt ${bold(out + path.sep)}`));
console.log(dim(`  ${files.length} files, ${kb(files.reduce((t, f) => t + size(f), 0))} total`));
console.log(dim(`  index.html ${kb(fs.statSync(path.join(out, 'index.html')).size)}, ${images.length} optimized images (${kb(images.reduce((t, f) => t + size(f), 0))})`));
console.log(dim(`  Preview it: npm run preview -- ${slug}\n`));
