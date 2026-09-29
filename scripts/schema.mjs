// npm run schema
// Regenerates lib/site.schema.json from lib/schema.js. Run it after changing
// the schema; it gives site.json autocomplete + inline errors in VS Code.
import fs from 'node:fs';
import { enterRepoRoot, green } from '../lib/cli.js';
import { jsonSchema } from '../lib/schema.js';

enterRepoRoot();
fs.writeFileSync('lib/site.schema.json', JSON.stringify(jsonSchema(), null, 2) + '\n');
console.log(green('Wrote lib/site.schema.json'));
