// npm run new -- <slug> --template <variant>
// Creates clients/<slug>/ with a starter site.json (placeholders marked
// TODO), labeled placeholder photos, and prints the intake checklist.
import fs from 'node:fs';
import path from 'node:path';
import { enterRepoRoot, slugArgs, fail, green, bold, dim } from '../lib/cli.js';
import { imagesDir, specPath } from '../lib/client.js';
import { VARIANT_IDS, getVariant } from '../templates/index.js';
import { makeMissingPlaceholders } from '../lib/placeholder-images.js';
import { intakeChecklist } from '../lib/intake.js';

enterRepoRoot();
const { slug, values, positionals } = slugArgs('new', { template: { type: 'string', short: 't' } });
// Also accept "npm run new -- <slug> <template>", and --template when npm
// swallowed it (PowerShell with older npm, or a forgotten "--").
const id = values.template ?? positionals[1] ?? process.env.npm_config_template;
if (!id || !VARIANT_IDS.includes(id))
  fail(`${id ? `Unknown template "${id}".` : 'Missing --template.'} Use: npm run new -- ${slug} --template <${VARIANT_IDS.join('|')}>`);
if (fs.existsSync(specPath(slug))) fail(`${specPath(slug)} already exists. Pick another slug or edit that site.json.`);

const variant = getVariant(id);
const spec = JSON.parse(fs.readFileSync('templates/base/example.site.json', 'utf8'));
spec.template = id;
spec.brand = { ...spec.brand, ...variant.exampleBrand };
spec.services = structuredClone(variant.services);

// Photos first, site.json last: an interrupted run can simply be re-run.
fs.mkdirSync(imagesDir(slug), { recursive: true });
const made = await makeMissingPlaceholders(spec, imagesDir(slug), [variant.exampleBrand.primary, '#111827']);
fs.writeFileSync(specPath(slug), JSON.stringify(spec, null, 2) + '\n');

console.log(green(`\nCreated ${bold(specPath(slug))}`));
console.log(dim(`  template: ${id}, ${made.length} placeholder photos in ${imagesDir(slug)}${path.sep}\n`));
console.log(intakeChecklist(variant));
console.log(bold('NEXT'));
console.log(`  1. Fill in ${specPath(slug)} (every TODO) and drop real photos in ${imagesDir(slug)}${path.sep}`);
console.log(`  2. npm run check -- ${slug}     lists anything missing or still a placeholder`);
console.log(`  3. npm run dev -- ${slug}       live preview while you edit`);
console.log(`  4. npm run build -- ${slug}     static site in dist/${slug}/\n`);
