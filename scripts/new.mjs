// npm run new -- <slug> --template <variant>
// Creates clients/<slug>/ with a starter site.json (placeholders marked
// TODO), labeled placeholder photos, and prints the intake checklist.
import fs from 'node:fs';
import path from 'node:path';
import { enterRepoRoot, slugArgs, fail, green, bold, dim } from '../lib/cli.js';
import { clientDir, imagesDir, specPath } from '../lib/client.js';
import { VARIANT_IDS, getVariant } from '../templates/index.js';
import { makeMissingPlaceholders } from '../lib/placeholder-images.js';
import { intakeChecklist } from '../lib/intake.js';

enterRepoRoot();
const { slug, values } = slugArgs('new', { template: { type: 'string', short: 't' } });
const id = values.template;
if (!id || !VARIANT_IDS.includes(id))
  fail(`${id ? `Unknown template "${id}".` : 'Missing --template.'} Use: npm run new -- ${slug} --template <${VARIANT_IDS.join('|')}>`);
if (fs.existsSync(clientDir(slug))) fail(`${clientDir(slug)} already exists. Pick another slug or edit that site.json.`);

const variant = getVariant(id);
const spec = JSON.parse(fs.readFileSync('templates/base/example.site.json', 'utf8'));
spec.template = id;
spec.brand = { ...spec.brand, ...variant.exampleBrand };
spec.services = structuredClone(variant.services);

fs.mkdirSync(imagesDir(slug), { recursive: true });
fs.writeFileSync(specPath(slug), JSON.stringify(spec, null, 2) + '\n');
const made = await makeMissingPlaceholders(spec, imagesDir(slug), [variant.exampleBrand.primary, '#111827']);

console.log(green(`\nCreated ${bold(clientDir(slug) + path.sep)}`));
console.log(dim(`  site.json (template: ${id}), images/ with ${made.length} placeholder photos\n`));
console.log(intakeChecklist(variant));
console.log(bold('NEXT'));
console.log(`  1. Fill in ${specPath(slug)} (every TODO) and drop real photos in ${imagesDir(slug)}${path.sep}`);
console.log(`  2. npm run check -- ${slug}     lists anything missing or still a placeholder`);
console.log(`  3. npm run dev -- ${slug}       live preview while you edit`);
console.log(`  4. npm run build -- ${slug}     static site in dist/${slug}/\n`);
