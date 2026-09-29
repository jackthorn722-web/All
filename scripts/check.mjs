// npm run check -- <slug>
// Validates clients/<slug>/site.json. Lists every error (missing/invalid
// field) and every placeholder by exact path. Exits 1 unless both are zero.
import { enterRepoRoot, slugArgs, validateAndReport } from '../lib/cli.js';

enterRepoRoot();
const { slug } = slugArgs('check');
const { errors, placeholders } = validateAndReport(slug);
process.exit(errors.length || placeholders.length ? 1 : 0);
