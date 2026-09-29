// Cloudflare: wrangler for the Pages project + upload (works with an API token
// or `wrangler login`), and the REST API for custom domains + DNS (needs
// CLOUDFLARE_API_TOKEN). Node built-ins only.
import { spawn } from 'node:child_process';
import path from 'node:path';

// Same variable wrangler honors, so a test server can stand in for both.
const API = () => process.env.CLOUDFLARE_API_BASE_URL || 'https://api.cloudflare.com/client/v4';
const WRANGLER = path.join('node_modules', 'wrangler', 'bin', 'wrangler.js');

// --- wrangler ------------------------------------------------------------

// Runs wrangler with node directly (no .cmd shim, so it behaves the same on
// Windows). `show` streams its output; the output is also returned.
export function wrangler(args, { show = true, interactive = false } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [WRANGLER, ...args], {
      stdio: interactive ? 'inherit' : ['inherit', 'pipe', 'pipe'],
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    });
    let out = '';
    const take = (stream, sink) =>
      stream?.on('data', (d) => {
        out += d;
        if (show) sink.write(d);
      });
    take(child.stdout, process.stdout);
    take(child.stderr, process.stderr);
    child.on('close', (code) => resolve({ code, out }));
    child.on('error', (e) => resolve({ code: 1, out: String(e) }));
  });
}

// { name, subdomain: "twintuned.pages.dev", domains: [...] } or null.
export async function findProject(name) {
  const { code, out } = await wrangler(['pages', 'project', 'list', '--json'], { show: false });
  if (code !== 0) throw new Error(`wrangler could not list your Pages projects:\n${errorsIn(out)}`);
  const json = out.slice(out.indexOf('['), out.lastIndexOf(']') + 1);
  const list = JSON.parse(json || '[]');
  const p = list.find((x) => x['Project Name'] === name);
  if (!p) return null;
  const domains = p['Project Domains'].split(',').map((d) => d.trim()).filter(Boolean);
  return { name, subdomain: domains.find((d) => d.endsWith('.pages.dev')) ?? `${name}.pages.dev`, domains };
}

// --force: create a real Pages project even when wrangler thinks an AI agent
// is driving it (it would otherwise create a Workers project instead).
export async function createProject(name) {
  const { code, out } = await wrangler(['pages', 'project', 'create', name, '--production-branch', 'main', '--force']);
  if (code !== 0 && !/already exists/i.test(out)) throw new Error(`wrangler could not create the Pages project "${name}".`);
}

// Uploads `dir`. Returns the unique deployment URL and the branch alias URL.
export async function deployDir(dir, project, branch) {
  const { code, out } = await wrangler(['pages', 'deploy', dir, '--project-name', project, '--branch', branch, '--commit-dirty=true']);
  if (code !== 0) throw new Error('wrangler could not upload the site (see its output above).');
  return {
    url: /Take a peek over at (\S+)/.exec(out)?.[1] ?? null,
    alias: /Deployment alias URL: (\S+)/.exec(out)?.[1] ?? null,
  };
}

// wrangler's own error lines (from "[ERROR]" on), without colors and boilerplate.
function errorsIn(out) {
  const lines = out.replace(/\x1b\[[0-9;]*m/g, '').split('\n');
  const start = lines.findIndex((l) => l.includes('[ERROR]'));
  const picked = (start < 0 ? lines.slice(-6) : lines.slice(start)).filter(
    (l) => l.trim() && !/If you think this is a bug|Logs were written|Getting User settings/.test(l),
  );
  return picked.slice(0, 8).map((l) => '  ' + l.trim()).join('\n');
}

// --- REST API (custom domains + DNS) ------------------------------------

export class CloudflareError extends Error {
  constructor(status, errors, what) {
    const detail = errors.map((e) => `${e.message} (code ${e.code})`).join('; ') || `HTTP ${status}`;
    super(`Cloudflare API: ${what} failed: ${detail}`);
    this.status = status;
    this.errors = errors;
  }
}

export function cloudflareApi({ token, accountId }) {
  async function call(method, route, body, what) {
    let res;
    try {
      res = await fetch(API() + route, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new Error(`Could not reach Cloudflare (${e.cause?.code ?? e.message}). Check the internet connection.`);
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      const err = new CloudflareError(res.status, json.errors ?? [], what);
      const authCodes = [9106, 9109, 10000, 10001];
      if (res.status === 401 || res.status === 403 || err.errors.some((x) => authCodes.includes(x.code)))
        err.message += `\nCheck CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID in .env and the token's permissions (README: "Cloudflare API token").`;
      throw err;
    }
    return json.result;
  }
  const acct = `/accounts/${accountId}`;
  const enc = encodeURIComponent;
  return {
    addDomain: (project, name) => call('POST', `${acct}/pages/projects/${project}/domains`, { name }, `adding ${name} to ${project}`),
    getDomain: (project, name) => call('GET', `${acct}/pages/projects/${project}/domains/${enc(name)}`, null, `checking ${name}`),
    listDomains: (project) => call('GET', `${acct}/pages/projects/${project}/domains`, null, `listing domains of ${project}`),
    findZone: (name) => call('GET', `/zones?name=${enc(name)}&account.id=${accountId}`, null, `looking up ${name}`),
    dnsRecords: (zoneId, name) => call('GET', `/zones/${zoneId}/dns_records?name=${enc(name)}`, null, `reading DNS for ${name}`),
    createDns: (zoneId, record) => call('POST', `/zones/${zoneId}/dns_records`, record, `creating DNS for ${record.name}`),
  };
}
