// npm run dev -- <slug>
// Local preview with hot reload (edit site.json or a template and the page
// refreshes). Errors block; placeholders only warn so you can preview.
import { enterRepoRoot, slugArgs, validateAndReport } from '../lib/cli.js';

enterRepoRoot();
const { slug } = slugArgs('dev');
const { errors } = validateAndReport(slug, { full: false });
if (errors.length) process.exit(1);

process.env.CLIENT_SLUG = slug;
const { dev } = await import('astro');
await dev({ root: process.cwd() });
