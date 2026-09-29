// Loading and validating one client's site.json. Used by the CLI scripts,
// astro.config.mjs and the Astro pages, so it only uses Node built-ins.
// All paths are relative to the repo root (the scripts chdir there first).
import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { siteSchema, errorMap, jsonSchema, IMAGE_EXTENSIONS } from './schema.js';
import { findPlaceholders, formatPath } from './placeholders.js';
import { buildModel } from './model.js';
import { getVariant } from '../templates/index.js';
import { TOKENS } from '../templates/base/defaults.js';

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

export const clientDir = (slug) => path.join('clients', slug);
export const imagesDir = (slug) => path.join('clients', slug, 'images');
export const specPath = (slug) => path.join('clients', slug, 'site.json');

export function listClients() {
  if (!fs.existsSync('clients')) return [];
  return fs.readdirSync('clients').filter((d) => fs.existsSync(specPath(d)));
}

// Windows editors save UTF-8 with a BOM (Notepad) or UTF-16 (PowerShell 5.1's `>`).
function decodeText(buf) {
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.subarray(2).toString('utf16le');
  if (buf[0] === 0xfe && buf[1] === 0xff) return Buffer.from(buf.subarray(2)).swap16().toString('utf16le');
  return buf.toString('utf8').replace(/^﻿/, '');
}

// Loads .env into process.env (variables already set win). No dotenv needed.
export function loadEnv() {
  if (!fs.existsSync('.env')) return;
  for (const [key, value] of Object.entries(parseEnv(decodeText(fs.readFileSync('.env')))))
    if (process.env[key] === undefined) process.env[key] = value;
}

export const formKeyName = (slug) => `WEB3FORMS_KEY_${slug.toUpperCase().replace(/-/g, '_')}`;

export function formKeyFor(slug) {
  return process.env[formKeyName(slug)] || process.env.WEB3FORMS_KEY || '';
}

// The public URL the site is built for. `npm run deploy` passes the real one
// (preview alias or *.pages.dev name) through DIALEDIN_SITE_URL.
export function siteUrl(spec, slug) {
  return process.env.DIALEDIN_SITE_URL || `https://${spec?.domain || `${slug}.pages.dev`}`;
}

export const isPreviewBuild = () => process.env.DIALEDIN_PREVIEW === '1';

// Cloudflare Pages _headers file for a build.
export function pagesHeaders({ domain, preview }) {
  const rules = [
    '# Written by the build (lib/client.js). Cloudflare Pages reads this file.',
    '/_astro/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/*',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
  ];
  if (preview) rules.push('  X-Robots-Tag: noindex');
  // With a custom domain, keep the duplicate *.pages.dev copy out of Google.
  if (!preview && domain) rules.push('', 'https://:project.pages.dev/*', '  X-Robots-Tag: noindex');
  return rules.join('\n') + '\n';
}

// Reads site.json. Returns { raw } or { error } explaining the JSON problem.
export function readSpec(slug) {
  const file = specPath(slug);
  if (!fs.existsSync(file)) return { error: `${file} does not exist. Create it with: npm run new -- ${slug} --template <variant>` };
  const src = decodeText(fs.readFileSync(file));
  try {
    return { raw: JSON.parse(src) };
  } catch (e) {
    return { error: `${file} is not valid JSON: ${jsonProblem(src, e)}` };
  }
}

const lineOf = (src, index) => src.slice(0, index).split('\n').length;

// Turn V8's JSON error into "line N: what to fix" for the usual mistakes,
// falling back to line + column and V8's own message.
function jsonProblem(src, e) {
  const msg = e.message.replace(/\s+/g, ' ');
  if (/Unexpected end of JSON input/.test(msg)) return 'the file ends too early (a missing } or ] at the end?)';
  let pos = Number(/position (\d+)/.exec(msg)?.[1] ?? NaN);
  // "Unexpected token 'x', ..."context"... is not valid JSON": find the context.
  const m = /Unexpected token '(.+?)', (\.\.\.)?"([\s\S]*?)"(\.\.\.)? is not valid JSON/.exec(e.message);
  if (m && Number.isNaN(pos)) {
    const at = src.indexOf(m[3]);
    if (at >= 0) pos = at + (m[2] ? 10 : m[3].indexOf(m[1]));
  }
  if (Number.isNaN(pos)) return msg;
  const lineStart = src.lastIndexOf('\n', pos - 1) + 1;
  const line = `line ${lineOf(src, pos)}`;
  const ch = src[pos];
  const prevAt = src.slice(0, pos).trimEnd().length - 1; // last non-space character before the error
  const prevLine = `line ${lineOf(src, prevAt)}`;
  const startsLine = src.slice(lineStart, pos).trim() === '';
  if (ch === '\u201c' || ch === '\u201d') return `${line} uses a curly quote (${ch}); JSON needs straight quotes "`;
  if (/non-whitespace character after JSON/.test(msg)) return `${line}: an extra } or ] near the end of the file`;
  if (/control character/.test(msg)) return `${line}: a line break inside quotes; keep each text value on one line`;
  if (/Unterminated string/.test(msg)) return `${line}: a text value is missing its closing quote "`;
  if (/Expected ':'/.test(msg)) return `${line}: a colon (:) is missing after the field name`;
  if (ch === '/') return `${line}: comments (//) are not allowed in JSON; delete them`;
  if (src[prevAt] === ',' && (ch === '}' || ch === ']')) return `${prevLine}: remove the comma at the end of this line`;
  if (/property name/.test(msg)) return `${line}: field names need double quotes, like "name": ...`;
  if (/Expected ',' or/.test(msg)) {
    if (startsLine) return `${prevLine}: a comma is missing at the end of this line`;
    if (src[prevAt] === '"') return `${line}: a " inside a text value ends it early; write \\" instead (or use curly quotes)`;
  }
  return `${line}, column ${pos - lineStart + 1}: ${msg}`;
}

// --- images --------------------------------------------------------------

const IMAGE_RE = new RegExp(`\\.(${IMAGE_EXTENSIONS.join('|')})$`, 'i');
const arr = (v) => (Array.isArray(v) ? v : []);

// [path, file] for every image field, read from a raw (maybe invalid) spec.
function imageFields(raw) {
  const out = [];
  const add = (p, v) => typeof v === 'string' && out.push([p, v]);
  add('brand.logo', raw?.brand?.logo);
  add('images.hero', raw?.images?.hero);
  add('images.owner', raw?.images?.owner);
  arr(raw?.gallery?.beforeAfter).forEach((g, i) => {
    add(`gallery.beforeAfter[${i}].before`, g?.before);
    add(`gallery.beforeAfter[${i}].after`, g?.after);
  });
  arr(raw?.gallery?.photos).forEach((g, i) => add(`gallery.photos[${i}].src`, g?.src));
  return out;
}

const wellFormed = (f) => IMAGE_RE.test(f) && !f.includes('\\') && f.split('/').every((s) => s && s !== '.' && s !== '..');

// The file must exist exactly as written, case included, folder by folder:
// Windows ignores case but the build does not.
function imageProblem(slug, file) {
  let dir = imagesDir(slug);
  const parts = file.split('/');
  for (const [i, part] of parts.entries()) {
    const entries = fs.existsSync(dir) && fs.statSync(dir).isDirectory() ? fs.readdirSync(dir) : [];
    if (!entries.includes(part)) {
      const other = entries.find((e) => e.toLowerCase() === part.toLowerCase());
      if (other) return `"${file}" not found; did you mean "${[...parts.slice(0, i), other, ...parts.slice(i + 1)].join('/')}"? (names are case-sensitive)`;
      return `"${file}" not found in ${imagesDir(slug)}${path.sep}`;
    }
    dir = path.join(dir, part);
  }
  return fs.statSync(dir).isFile() ? null : `"${file}" is a folder, not an image`;
}

// Images the build may import: referenced in site.json and present exactly.
export function imageRefs(raw, slug) {
  return [...new Set(imageFields(raw).map(([, f]) => f))].filter((f) => wellFormed(f) && !imageProblem(slug, f));
}

// --- validation ----------------------------------------------------------

// Full validation. Returns:
//   errors       [{ path, message, hint }]  must be fixed; dev/build refuse to run
//   placeholders [{ path, value, why }]     must be replaced before going live
//   notes        [string]                   worth a look, never blocking
//   data         the parsed spec (defaults applied) when there are no errors
export function validateSpec(raw, slug) {
  const errors = [];
  const notes = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return { errors: [{ path: '(top level)', message: 'site.json must be one { ... } object', hint: '' }], placeholders: [], notes, data: null };
  const placeholders = findPlaceholders(raw);
  if (raw.business && typeof raw.business === 'object' && raw.business.textsOk === undefined)
    placeholders.push({ path: 'business.textsOk', value: '(not set)', why: 'ask: does this number take texts? true or false' });
  const placeholderPaths = new Set(placeholders.map((p) => p.path));

  const result = siteSchema.safeParse(raw, { error: errorMap, reportInput: true });
  if (!result.success) {
    for (const iss of result.error.issues) {
      if (iss.code === 'unrecognized_keys') {
        for (const key of iss.keys) {
          const allowed = allowedKeys(iss.path);
          const guess = closest(key, allowed);
          errors.push({
            path: formatPath([...iss.path, key]),
            message: `is not a known field${guess ? ` (did you mean "${guess}"?)` : ''}`,
            hint: allowed.length ? `allowed here: ${allowed.join(', ')}` : '',
          });
        }
        continue;
      }
      const p = formatPath(iss.path);
      // Missing / wrong-type values always get the same plain wording.
      const generic = iss.code === 'invalid_type' || (iss.code === 'invalid_value' && iss.input === undefined);
      const message = (generic && errorMap(iss)) || iss.message;
      errors.push({
        path: p || '(top level)',
        message: message + (placeholderPaths.has(p) ? ' (it is still a placeholder)' : ''),
        hint: describe(iss.path),
      });
    }
  }

  // These run even when the schema fails, so one check lists every problem.
  const reported = new Set(errors.map((e) => e.path));
  const extra = [...crossFieldErrors(raw), ...tokenErrors(raw)];
  for (const [p, file] of imageFields(raw)) {
    const problem = wellFormed(file) && imageProblem(slug, file);
    if (problem) extra.push({ path: p, message: problem, hint: '' });
  }
  for (const e of extra) if (!reported.has(e.path)) errors.push(e);
  if (errors.length) return { errors, placeholders, notes, data: null };

  const spec = result.data;
  const variant = getVariant(spec.template);
  const model = buildModel(spec, { slug, siteUrl: siteUrl(spec, slug) });

  // Non-blocking notes: things that are optional but usually wanted.
  const unset = [
    ['business.foundedYear', spec.business.foundedYear, 'the trust bar will skip years in business'],
    ['reviews.googleRating', spec.reviews.googleRating, 'the trust bar will skip the Google rating'],
    ['reviews.googleReviewsUrl', spec.reviews.googleReviewsUrl, 'no "see all reviews" link'],
    ['socials.googleBusinessProfile', spec.socials.googleBusinessProfile, 'no Google Business Profile link'],
    ['brand.logo', spec.brand.logo, 'the business name is shown as text; favicon is a letter mark'],
    ['images.hero', spec.images.hero, 'the hero has no photo'],
    ['domain', spec.domain, `canonical URL falls back to ${siteUrl(spec, slug)}`],
  ];
  for (const [p, v, why] of unset) if (v === undefined) notes.push(`${p} is not set: ${why}`);
  if (!formKeyFor(slug)) notes.push(`No Web3Forms key in .env (WEB3FORMS_KEY or ${formKeyName(slug)}): the contact form will not send`);
  if (!spec.services) notes.push(`services: using the ${spec.template} defaults (confirm them with the client)`);
  else {
    const same = spec.services.filter((s) => variant.services.some((d) => d.name === s.name && d.description === s.description)).length;
    if (same) notes.push(`services: ${same} of ${spec.services.length} still have the ${spec.template} default name and description (confirm with the client)`);
    if (spec.services.every((s) => s.startingPrice === undefined)) notes.push('services: no starting prices set');
  }
  if (!spec.faq) notes.push(`faq: using the ${spec.template} default answers (read them to the client)`);
  if (!spec.reviews.items.length) notes.push('reviews: none yet, so the reviews section is hidden');
  else if (spec.reviews.items.length < 3) notes.push(`reviews: only ${spec.reviews.items.length}; 3-6 looks best`);
  if (spec.business.serviceArea.nearbyCities.length === 0) notes.push('business.serviceArea.nearbyCities is empty');
  const noAlt = spec.gallery.photos.flatMap((p, i) => (p.alt ? [] : [`gallery.photos[${i}]`]));
  if (noAlt.length) notes.push(`${noAlt.join(', ')} ha${noAlt.length === 1 ? 's' : 've'} no alt text (helps Google and screen readers)`);
  if (model.seo.title.length > 65) notes.push(`page title is ${model.seo.title.length} characters; Google shows about 60 (set seo.title)`);
  if (model.seo.description.length > 160)
    notes.push(`meta description is ${model.seo.description.length} characters; Google cuts off around 155-160 (set seo.metaDescription)`);

  return { errors, placeholders, notes, data: spec };
}

// Rules that involve two fields.
function crossFieldErrors(raw) {
  const out = [];
  const cta = raw.cta && typeof raw.cta === 'object' ? raw.cta : {};
  if (cta.primary === 'text' && raw.business?.textsOk === false)
    out.push({ path: 'cta.primary', message: 'is "text" but business.textsOk is false', hint: '' });
  if (cta.primary === 'book' && !cta.bookingUrl)
    out.push({ path: 'cta.bookingUrl', message: 'is missing (cta.primary is "book")', hint: describe(['cta', 'bookingUrl']) });
  return out;
}

// {tokens} are filled in copy, business.tagline, faq and seo only.
const TOKEN_FIELDS = /^(copy\.\w+|business\.tagline|faq\[\d+\]\.[qa]|seo\.(title|metaDescription))$/;
const TOKEN_LIST = TOKENS.map((t) => `{${t}}`).join(' ');

function tokenErrors(value, p = []) {
  if (Array.isArray(value)) return value.flatMap((v, i) => tokenErrors(v, [...p, i]));
  if (value && typeof value === 'object')
    return Object.entries(value).flatMap(([k, v]) => (k === '$schema' ? [] : tokenErrors(v, [...p, k])));
  if (typeof value !== 'string') return [];
  const where = formatPath(p);
  const used = [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  if (!used.length) return [];
  if (!TOKEN_FIELDS.test(where)) {
    // Braces in word-for-word text (a review, a name) are fine; only flag real tokens.
    const token = used.find((t) => TOKENS.includes(t));
    return token ? [{ path: where, message: `uses {${token}}, but tokens only work in copy, business.tagline, faq and seo`, hint: '' }] : [];
  }
  const unknown = used.filter((t) => !TOKENS.includes(t));
  return unknown.length ? [{ path: where, message: `uses unknown token {${unknown[0]}}`, hint: `tokens: ${TOKEN_LIST}` }] : [];
}

// --- helpers for friendly error text ------------------------------------

let _json;
function nodeAt(p) {
  _json ??= jsonSchema();
  let node = _json;
  for (const key of p) {
    if (!node) return null;
    node = typeof key === 'number' ? node.items : node.properties?.[key];
  }
  return node;
}

function describe(p) {
  return nodeAt(p)?.description ?? '';
}

function allowedKeys(p) {
  return Object.keys(nodeAt(p)?.properties ?? {}).filter((k) => k !== '$schema');
}

function closest(word, options) {
  let best = null;
  let bestD = Infinity;
  for (const o of options) {
    const d = levenshtein(word.toLowerCase(), o.toLowerCase());
    if (d < bestD) [best, bestD] = [o, d];
  }
  return bestD <= Math.max(2, Math.floor(word.length / 3)) ? best : null;
}

function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}
