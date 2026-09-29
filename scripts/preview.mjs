// npm run preview -- <slug>
// Serves the already-built dist/<slug>/ exactly as it will be deployed.
import fs from 'node:fs';
import path from 'node:path';
import { enterRepoRoot, slugArgs, fail } from '../lib/cli.js';

enterRepoRoot();
const { slug } = slugArgs('preview');
if (!fs.existsSync(path.join('dist', slug, 'index.html'))) fail(`Nothing built yet. Run: npm run build -- ${slug}`);

process.env.CLIENT_SLUG = slug;
const { preview } = await import('astro');
await preview({ root: process.cwd() });
