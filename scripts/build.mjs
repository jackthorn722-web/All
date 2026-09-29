// npm run build -- <slug>
// Static site in dist/<slug>/. Errors block; placeholders only warn
// (deploy --prod refuses them).
import { enterRepoRoot, slugArgs, validateAndReport, dim } from '../lib/cli.js';
import { buildSite, printSummary } from '../lib/build.js';

enterRepoRoot();
const { slug } = slugArgs('build');
const { errors } = validateAndReport(slug, { full: false });
if (errors.length) process.exit(1);

printSummary(await buildSite(slug));
console.log(dim(`  Preview it: npm run preview -- ${slug}\n`));
