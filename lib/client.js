// Loading and validating one client's site.json. Used by the CLI scripts,
// astro.config.mjs and the Astro pages, so it only uses Node built-ins.
// All paths are relative to the repo root (the scripts chdir there first).
import fs from 'node:fs';
import path from 'node:path';
import { siteSchema, errorMap, jsonSchema } from './schema.js';
import { findPlaceholders, formatPath } from './placeholders.js';
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

// Loads .env into process.env (existing env vars win). No dotenv needed.
export function loadEnv() {
  if (fs.existsSync('.env')) process.loadEnvFile('.env');
}

export function formKeyFor(slug) {
  const own = `WEB3FORMS_KEY_${slug.toUpperCase().replace(/-/g, '_')}`;
  return process.env[own] || process.env.WEB3FORMS_KEY || '';
}

export function siteUrl(spec, slug) {
  return `https://${spec?.domain || `${slug}.pages.dev`}`;
}

// Reads site.json. Returns { raw } or { error } with the JSON syntax problem.
export function readSpec(slug) {
  const file = specPath(slug);
  if (!fs.existsSync(file)) return { error: `${file} does not exist. Create it with: npm run new -- ${slug} --template <variant>` };
  const src = fs.readFileSync(file, 'utf8').replace(/^﻿/, ''); // Windows Notepad adds a BOM
  try {
    return { raw: JSON.parse(src) };
  } catch (e) {
    const pos = Number(/position (\d+)/.exec(e.message)?.[1]);
    const where = Number.isFinite(pos) ? ` (line ${src.slice(0, pos).split('\n').length})` : '';
    return { error: `${file} is not valid JSON${where}: ${e.message}` };
  }
}

// Full validation. Returns:
//   errors       [{ path, message, hint }]  must be fixed; dev/build refuse to run
//   placeholders [{ path, value, why }]     must be replaced before going live
//   notes        [string]                   worth a look, never blocking
//   data         the parsed spec (defaults applied) when there are no errors
export function validateSpec(raw, slug) {
  const errors = [];
  const notes = [];
  const placeholders = findPlaceholders(raw);
  const placeholderPaths = new Set(placeholders.map((p) => p.path));

  // Unknown {tokens} in copy are reported even when other fields fail.
  checkTokens(raw?.copy, errors);
  const result = siteSchema.safeParse(raw, { error: errorMap });
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
      errors.push({
        path: p || '(top level)',
        message: iss.message + (placeholderPaths.has(p) ? ' (it is still a placeholder)' : ''),
        hint: describe(iss.path),
      });
    }
    return { errors, placeholders, notes, data: null };
  }

  const spec = result.data;
  const variant = getVariant(spec.template);
  checkImages(spec, slug, errors);

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
  if (!formKeyFor(slug))
    notes.push(`No Web3Forms key in .env (WEB3FORMS_KEY or ${`WEB3FORMS_KEY_${slug.toUpperCase().replace(/-/g, '_')}`}): the contact form will not send`);
  if (!spec.services) notes.push(`services: using the ${spec.template} defaults (confirm them with the client)`);
  else if (spec.services.every((s, i) => s.name === variant.services[i]?.name))
    notes.push(`services: still the ${spec.template} defaults (confirm names, descriptions and add starting prices)`);
  else if (spec.services.every((s) => s.startingPrice === undefined)) notes.push('services: no starting prices set');
  if (!spec.faq) notes.push(`faq: using the ${spec.template} default answers (read them to the client)`);
  if (spec.reviews.items.length < 3) notes.push(`reviews: only ${spec.reviews.items.length}; 3-6 looks best`);
  if (spec.business.serviceArea.nearbyCities.length === 0) notes.push('business.serviceArea.nearbyCities is empty');
  if (spec.seo.metaDescription && spec.seo.metaDescription.length > 160)
    notes.push(`seo.metaDescription is ${spec.seo.metaDescription.length} characters; Google cuts off around 155-160`);

  return { errors, placeholders, notes, data: errors.length ? null : spec };
}

function checkImages(spec, slug, errors) {
  const refs = [
    ['brand.logo', spec.brand.logo],
    ['images.hero', spec.images.hero],
    ['images.owner', spec.images.owner],
    ...spec.gallery.beforeAfter.flatMap((g, i) => [
      [`gallery.beforeAfter[${i}].before`, g.before],
      [`gallery.beforeAfter[${i}].after`, g.after],
    ]),
    ...spec.gallery.photos.map((g, i) => [`gallery.photos[${i}].src`, g.src]),
  ];
  for (const [p, file] of refs) {
    if (!file) continue;
    const full = path.join(imagesDir(slug), file);
    const dir = path.dirname(full);
    const entries = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    const base = path.basename(full);
    if (entries.includes(base)) continue;
    // Windows ignores case but the build (and Linux) does not.
    const other = entries.find((e) => e.toLowerCase() === base.toLowerCase());
    errors.push({
      path: p,
      message: other
        ? `"${file}" not found; the file is named "${path.posix.join(path.posix.dirname(file), other).replace(/^\.\//, '')}" (names are case-sensitive)`
        : `"${file}" not found in ${imagesDir(slug)}${path.sep}`,
      hint: '',
    });
  }
}

function checkTokens(copy, errors) {
  if (!copy || typeof copy !== 'object') return;
  for (const [key, value] of Object.entries(copy)) {
    if (typeof value !== 'string') continue;
    for (const [, token] of value.matchAll(/\{(\w+)\}/g)) {
      if (!TOKENS.includes(token))
        errors.push({ path: `copy.${key}`, message: `uses unknown token {${token}}`, hint: `tokens: ${TOKENS.map((t) => `{${t}}`).join(' ')}` });
    }
  }
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
