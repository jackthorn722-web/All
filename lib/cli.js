// Shared helpers for the npm scripts: repo-root cwd, argument parsing and
// the plain-ASCII validation report (safe in any Windows terminal).
import { parseArgs, styleText } from 'node:util';
import { fileURLToPath } from 'node:url';
import { readSpec, validateSpec, listClients, loadEnv, formKeyFor, formKeyName, SLUG_RE, specPath } from './client.js';

export function enterRepoRoot() {
  process.chdir(fileURLToPath(new URL('..', import.meta.url)));
  loadEnv();
}

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (fmt, s) => (color ? styleText(fmt, s) : s);
export const red = (s) => paint('red', s);
export const yellow = (s) => paint('yellow', s);
export const green = (s) => paint('green', s);
export const dim = (s) => paint('dim', s);
export const bold = (s) => paint('bold', s);

export function fail(message) {
  console.error(red(`\n${message}\n`));
  process.exit(1);
}

// `npm run <cmd> -- <slug> [--flags]`: returns { slug, values }.
export function slugArgs(command, options = {}) {
  let parsed;
  try {
    parsed = parseArgs({ args: process.argv.slice(2), allowPositionals: true, options });
  } catch (e) {
    fail(e.message);
  }
  const slug = parsed.positionals[0];
  if (!slug) {
    const known = listClients();
    fail(`Usage: npm run ${command} -- <slug>${known.length ? `\nClients: ${known.join(', ')}` : ''}`);
  }
  if (!SLUG_RE.test(slug)) fail(`"${slug}" is not a valid slug: use lowercase letters, numbers and dashes, e.g. "twintuned".`);
  return { slug, values: parsed.values, positionals: parsed.positionals };
}

const pad = (s, n) => (s.length >= n ? s + '  ' : s + ' '.repeat(n - s.length));

// Validates and prints a report. `full` lists every placeholder and note.
export function validateAndReport(slug, { full = true } = {}) {
  const { raw, error } = readSpec(slug);
  if (error) fail(error);
  const result = validateSpec(raw, slug);
  const { errors, placeholders, notes } = result;
  const width = Math.min(42, Math.max(0, ...errors.map((e) => e.path.length), ...placeholders.map((p) => p.path.length)) + 2);

  console.log(`\n${bold(`${specPath(slug)}`)}${raw?.template ? dim(`  (template: ${raw.template})`) : ''}`);

  if (errors.length) {
    console.log(red(`\nERRORS (${errors.length}) - must fix before dev/build will run:`));
    for (const e of errors) {
      console.log(`  ${red(pad(e.path, width))}${e.message}`);
      if (e.hint) console.log(`  ${' '.repeat(width)}${dim(e.hint)}`);
    }
  }
  if (placeholders.length) {
    if (full) {
      console.log(yellow(`\nPLACEHOLDERS (${placeholders.length}) - replace before going live:`));
      for (const p of placeholders) console.log(`  ${yellow(pad(p.path, width))}${JSON.stringify(truncate(p.value, 60))} ${dim(`(${p.why})`)}`);
    } else {
      console.log(yellow(`\n${placeholders.length} placeholder(s) still in site.json. See them: npm run check -- ${slug}`));
    }
  }
  if (!full && !formKeyFor(slug))
    console.log(yellow(`No Web3Forms key in .env (WEB3FORMS_KEY or ${formKeyName(slug)}): the contact form will not send.`));
  if (full && notes.length) {
    console.log(dim(`\nNOTES (${notes.length}) - optional, worth a look:`));
    for (const n of notes) console.log(dim(`  - ${n}`));
  }
  if (full) {
    const ok = !errors.length && !placeholders.length;
    console.log(
      ok
        ? green('\nREADY: no errors, no placeholders.\n')
        : red(`\nNOT READY: ${errors.length} error(s), ${placeholders.length} placeholder(s).\n`),
    );
  }
  return result;
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 3) + '...' : s;
}
