// The dashboard's local web server (npm run dashboard). Node built-ins + sharp
// only. It listens on 127.0.0.1 and refuses requests whose Host/Origin is not
// this machine, so other devices (and other websites in your browser) can't
// reach it. Every action runs the same npm scripts you'd run by hand.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import {
  SLUG_RE,
  listClients,
  readSpec,
  validateSpec,
  specPath,
  imagesDir,
  clientDir,
  imageFields,
  formKeyFor,
  formKeyName,
} from '../lib/client.js';
import { VARIANTS, getVariant } from '../templates/index.js';
import { IMAGE_EXTENSIONS } from '../lib/schema.js';

const HTML = new URL('./index.html', import.meta.url);
const IMAGE_RE = new RegExp(`\\.(${IMAGE_EXTENSIONS.join('|')})$`, 'i');

// --- helpers ---------------------------------------------------------------

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}
const bad = (res, message, status = 400) => send(res, status, { error: message });

async function readBody(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new Error(`Too large (limit ${Math.round(limit / 1e6)} MB)`);
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

function deploysOf(slug) {
  try {
    return JSON.parse(fs.readFileSync(path.join(clientDir(slug), 'deploys.json'), 'utf8'));
  } catch {
    return {};
  }
}

// Every image file in the client's folder, with where site.json uses it.
function imagesOf(slug, raw) {
  const dir = imagesDir(slug);
  const used = {};
  for (const [p, f] of raw ? imageFields(raw) : []) (used[f] ??= []).push(p);
  const out = [];
  const walk = (rel) => {
    for (const e of fs.existsSync(path.join(dir, rel)) ? fs.readdirSync(path.join(dir, rel), { withFileTypes: true }) : []) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(r);
      else if (IMAGE_RE.test(e.name) || /\.hei[cf]$/i.test(e.name))
        out.push({ name: r, size: fs.statSync(path.join(dir, r)).size, used: used[r] ?? [], placeholder: /^placeholder/i.test(e.name), heic: /\.hei[cf]$/i.test(e.name) });
    }
  };
  walk('');
  return out.sort((a, b) => a.placeholder - b.placeholder || a.name.localeCompare(b.name));
}

function summary(slug) {
  const { raw, error } = readSpec(slug);
  const deploys = deploysOf(slug);
  if (error) return { slug, error, deploys };
  const v = validateSpec(raw, slug);
  return {
    slug,
    name: raw.business?.name ?? slug,
    template: raw.template,
    city: raw.business?.serviceArea?.homeCity ?? '',
    hero: typeof raw.images?.hero === 'string' ? raw.images.hero : null,
    errors: v.errors.length,
    placeholders: v.placeholders.length,
    domain: raw.domain ?? null,
    deploys,
  };
}

function detail(slug) {
  const { raw, error } = readSpec(slug);
  const v = raw ? validateSpec(raw, slug) : { errors: [], placeholders: [], notes: [] };
  const variant = raw && VARIANTS[raw.template] ? getVariant(raw.template) : null;
  return {
    slug,
    spec: raw ?? null,
    jsonError: error ?? null,
    validation: { errors: v.errors, placeholders: v.placeholders, notes: v.notes },
    images: imagesOf(slug, raw),
    variant: variant && { id: variant.id, label: variant.label, industry: variant.industry, services: variant.services, faq: variant.faq, copy: variant.copy },
    deploys: deploysOf(slug),
    formKey: Boolean(formKeyFor(slug)),
    formKeyName: formKeyName(slug),
  };
}

// --- jobs: npm scripts run in the background, output kept for the page ---

const jobs = new Map();
let nextId = 1;
const ACTIONS = {
  check: (s) => ['scripts/check.mjs', s],
  dev: (s) => ['scripts/dev.mjs', s],
  build: (s) => ['scripts/build.mjs', s],
  deploy: (s) => ['scripts/deploy.mjs', s],
  'deploy-prod': (s) => ['scripts/deploy.mjs', s, '--prod'],
};

function startJob(slug, action) {
  // Only one local preview server (port 4321) at a time.
  if (action === 'dev') for (const j of jobs.values()) if (j.action === 'dev' && !j.done) j.proc.kill();
  const job = { id: String(nextId++), slug, action, lines: [], done: false, code: null, url: null, started: Date.now() };
  const proc = spawn(process.execPath, ACTIONS[action](slug), { env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } });
  job.proc = proc;
  let partial = '';
  const take = (d) => {
    const text = (partial + d.toString()).replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
    const parts = text.split(/\r?\n/);
    partial = parts.pop();
    for (const line of parts) {
      job.lines.push(line);
      const m = /(?:Preview is up|Production is up): (\S+)/.exec(line) ?? /Local\s+(http:\/\/localhost:\d+\/?)/.exec(line);
      if (m) job.url = m[1];
    }
    if (job.lines.length > 4000) job.lines.splice(0, job.lines.length - 4000);
  };
  proc.stdout.on('data', take);
  proc.stderr.on('data', take);
  proc.on('close', (code) => {
    if (partial) job.lines.push(partial);
    job.done = true;
    job.code = code;
  });
  jobs.set(job.id, job);
  return job;
}

const jobView = (j, from = 0) => ({ id: j.id, slug: j.slug, action: j.action, lines: j.lines.slice(from), total: j.lines.length, done: j.done, code: j.code, url: j.url });

// --- thumbnails ------------------------------------------------------------

const thumbs = new Map();
async function thumb(file) {
  const stat = fs.statSync(file);
  const key = `${file}:${stat.mtimeMs}`;
  if (!thumbs.has(key)) {
    const buf = /\.svg$/i.test(file)
      ? fs.readFileSync(file)
      : await sharp(file, { failOn: 'none' }).rotate().resize(480, 480, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
    thumbs.set(key, buf);
  }
  return thumbs.get(key);
}

// --- server ----------------------------------------------------------------

export function startDashboard({ port = 4400 } = {}) {
  const allowedHosts = new Set([`localhost:${port}`, `127.0.0.1:${port}`]);
  const server = http.createServer(async (req, res) => {
    try {
      // Only this machine, and only this page (blocks DNS-rebinding and cross-site requests).
      if (!allowedHosts.has(req.headers.host ?? '')) return bad(res, 'Forbidden host', 403);
      const origin = req.headers.origin;
      if (req.method !== 'GET' && origin && !allowedHosts.has(origin.replace(/^https?:\/\//, ''))) return bad(res, 'Forbidden origin', 403);

      const url = new URL(req.url, `http://${req.headers.host}`);
      const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);

      if (req.method === 'GET' && url.pathname === '/') return send(res, 200, fs.readFileSync(HTML), 'text/html; charset=utf-8');

      if (parts[0] === 'thumb') {
        const [, slug, ...rest] = parts;
        const rel = rest.join('/');
        if (!SLUG_RE.test(slug) || rest.some((p) => p === '..' || p.startsWith('.'))) return bad(res, 'Bad path');
        const file = path.join(imagesDir(slug), ...rest);
        if (!fs.existsSync(file) || !IMAGE_RE.test(rel)) return bad(res, 'Not found', 404);
        return send(res, 200, await thumb(file), /\.svg$/i.test(rel) ? 'image/svg+xml' : 'image/webp');
      }

      if (parts[0] !== 'api') return bad(res, 'Not found', 404);

      // GET /api/state
      if (req.method === 'GET' && parts[1] === 'state')
        return send(res, 200, {
          clients: listClients().map(summary),
          templates: Object.values(VARIANTS).map((v) => ({ id: v.id, label: v.label })),
          env: { formKey: Boolean(process.env.WEB3FORMS_KEY), cfToken: Boolean(process.env.CLOUDFLARE_API_TOKEN), cfAccount: Boolean(process.env.CLOUDFLARE_ACCOUNT_ID) },
          jobs: [...jobs.values()].filter((j) => !j.done).map((j) => jobView(j, j.lines.length)),
        });

      // POST /api/clients  {slug, template}
      if (req.method === 'POST' && parts[1] === 'clients' && parts.length === 2) {
        const { slug, template } = JSON.parse(await readBody(req, 1e4));
        if (!SLUG_RE.test(slug ?? '')) return bad(res, 'Use lowercase letters, numbers and dashes, e.g. "smith-lawn"');
        if (!VARIANTS[template]) return bad(res, 'Pick a template');
        if (fs.existsSync(specPath(slug))) return bad(res, `A client called "${slug}" already exists`);
        const code = await new Promise((r) => spawn(process.execPath, ['scripts/new.mjs', slug, '--template', template], { stdio: 'ignore' }).on('close', r));
        return code === 0 ? send(res, 200, detail(slug)) : bad(res, 'Could not create the client', 500);
      }

      if (parts[1] === 'clients' && parts[2]) {
        const slug = parts[2];
        if (!SLUG_RE.test(slug) || !fs.existsSync(clientDir(slug))) return bad(res, 'No such client', 404);

        if (req.method === 'GET' && parts.length === 3) return send(res, 200, detail(slug));

        // PUT /api/clients/:slug  (the whole site.json)
        if (req.method === 'PUT' && parts.length === 3) {
          const spec = JSON.parse(await readBody(req, 2e6));
          if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return bad(res, 'site.json must be an object');
          const { $schema = '../../lib/site.schema.json', ...rest } = spec;
          fs.writeFileSync(specPath(slug), JSON.stringify({ $schema, ...rest }, null, 2) + '\n');
          return send(res, 200, detail(slug));
        }

        // POST /api/clients/:slug/images?name=photo.jpg  (raw file body)
        if (req.method === 'POST' && parts[3] === 'images') {
          const original = path.basename(url.searchParams.get('name') ?? '');
          if (/\.hei[cf]$/i.test(original))
            return bad(res, `${original} is an iPhone HEIC photo, which can't be used. Ask for JPG (iPhone: Settings > Camera > Formats > Most Compatible), or open it in the Windows Photos app and "Save as" JPG.`);
          if (!IMAGE_RE.test(original)) return bad(res, `${original}: use JPG, PNG, WEBP or AVIF photos (SVG only for logos)`);
          const ext = original.split('.').pop().toLowerCase().replace('jpeg', 'jpg');
          const stem = original.slice(0, original.lastIndexOf('.')).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'photo';
          fs.mkdirSync(imagesDir(slug), { recursive: true });
          let name = `${stem}.${ext}`;
          for (let i = 2; fs.existsSync(path.join(imagesDir(slug), name)); i++) name = `${stem}-${i}.${ext}`;
          fs.writeFileSync(path.join(imagesDir(slug), name), await readBody(req, 60e6));
          return send(res, 200, { name, ...detail(slug) });
        }

        // DELETE /api/clients/:slug/images/<name>
        if (req.method === 'DELETE' && parts[3] === 'images' && parts[4]) {
          const rest = parts.slice(4);
          if (rest.some((p) => p === '..' || p.startsWith('.'))) return bad(res, 'Bad path');
          const file = path.join(imagesDir(slug), ...rest);
          if (fs.existsSync(file) && IMAGE_RE.test(file)) fs.rmSync(file);
          return send(res, 200, detail(slug));
        }
      }

      // POST /api/jobs {slug, action}
      if (req.method === 'POST' && parts[1] === 'jobs' && parts.length === 2) {
        const { slug, action } = JSON.parse(await readBody(req, 1e4));
        if (!SLUG_RE.test(slug ?? '') || !ACTIONS[action]) return bad(res, 'Unknown action');
        const busy = [...jobs.values()].find((j) => !j.done && j.slug === slug && j.action !== 'dev' && action !== 'dev');
        if (busy) return bad(res, `Already running "${busy.action}" for ${slug}. Wait for it to finish.`);
        return send(res, 200, jobView(startJob(slug, action)));
      }
      if (parts[1] === 'jobs' && parts[2]) {
        const job = jobs.get(parts[2]);
        if (!job) return bad(res, 'No such job', 404);
        if (req.method === 'GET') return send(res, 200, jobView(job, Number(url.searchParams.get('from') ?? 0)));
        if (req.method === 'POST' && parts[3] === 'stop') {
          job.proc.kill();
          return send(res, 200, jobView(job, job.lines.length));
        }
      }
      return bad(res, 'Not found', 404);
    } catch (e) {
      return bad(res, e instanceof SyntaxError ? 'That was not valid JSON' : e.message, 500);
    }
  });
  const stopAll = () => {
    for (const j of jobs.values()) if (!j.done) j.proc.kill();
  };
  process.on('exit', stopAll);
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}
