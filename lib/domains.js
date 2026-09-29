// Custom domain for a client's Pages project, run by `npm run deploy -- <slug> --prod`.
// With CLOUDFLARE_API_TOKEN: attach the domain (+ its www/apex twin) to the
// project and, when the domain's DNS is in this Cloudflare account, create the
// CNAME records. Anything it can't do safely is printed as exact steps.
import { bold, green, yellow, dim } from './cli.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// "www.example.com" -> ["www.example.com", "example.com"]: candidates for the zone.
function zoneCandidates(host) {
  const parts = host.split('.');
  return parts.slice(0, -1).map((_, i) => parts.slice(i).join('.')).filter((n) => n.includes('.'));
}

async function findZone(api, host) {
  for (const name of zoneCandidates(host)) {
    const zones = await api.findZone(name);
    if (zones?.length) return zones[0];
  }
  return null;
}

// The hostnames to attach: the domain, plus its www/apex twin when it is the zone apex.
function hostsFor(domain, zoneName) {
  if (zoneName && domain === zoneName) return [domain, `www.${domain}`];
  if (zoneName && domain === `www.${zoneName}`) return [domain, zoneName];
  return [domain];
}

// Adds a CNAME host -> target unless one is there already. Never touches
// existing A/AAAA/CNAME records (an old site, email setups): those are reported.
async function ensureCname(api, zone, host, target) {
  const records = await api.dnsRecords(zone.id, host);
  const web = records.filter((r) => ['A', 'AAAA', 'CNAME'].includes(r.type));
  if (web.some((r) => r.type === 'CNAME' && r.content === target)) return { ok: true, note: 'DNS already points here' };
  if (web.length) return { ok: false, conflict: web.map((r) => `${r.type} ${r.name} -> ${r.content}`) };
  await api.createDns(zone.id, { type: 'CNAME', name: host, content: target, proxied: true, ttl: 1, comment: 'Cloudflare Pages site (DialedIn Sites)' });
  return { ok: true, note: 'DNS record created' };
}

// Re-running deploy --prod is normal, so skip hosts the project already has.
async function attach(api, project, host) {
  const existing = (await api.listDomains(project)) ?? [];
  if (!existing.some((d) => d.name === host)) await api.addDomain(project, host);
}

async function waitForActive(api, project, hosts) {
  let status = {};
  for (let i = 0; i < 6; i++) {
    for (const h of hosts) status[h] = (await api.getDomain(project, h))?.status ?? 'unknown';
    if (hosts.every((h) => status[h] === 'active')) break;
    await sleep(5000);
  }
  return status;
}

export async function connectDomain({ api, project, subdomain, domain }) {
  console.log(bold(`\nCustom domain: ${domain}`));
  const zone = await findZone(api, domain);
  const hosts = hostsFor(domain, zone?.name);

  if (!zone) {
    // DNS lives elsewhere (GoDaddy, Namecheap, ...). A subdomain like www can be
    // attached now and goes live once the CNAME below exists; an apex can't.
    const apex = domain.split('.').length === 2;
    if (!apex) await attach(api, project, domain);
    console.log(yellow(`${domain} is not a site in this Cloudflare account, so its DNS can't be set automatically.`));
    printSteps({ project, subdomain, domain, attached: !apex });
    return false;
  }

  let allOk = true;
  for (const host of hosts) {
    await attach(api, project, host);
    const dns = await ensureCname(api, zone, host, subdomain);
    if (dns.ok) console.log(green(`  ${host}: attached, ${dns.note}`));
    else {
      allOk = false;
      console.log(yellow(`  ${host}: attached, but DNS already has: ${dns.conflict.join(', ')}`));
      console.log(`    Replace it: Cloudflare dashboard > ${zone.name} > DNS > Records: delete that record, add`);
      console.log(`    CNAME  ${host === zone.name ? '@' : host.slice(0, -zone.name.length - 1)}  ->  ${subdomain}  (Proxied), then run deploy --prod again.`);
    }
  }
  const status = await waitForActive(api, project, hosts);
  for (const h of hosts) {
    const s = status[h];
    console.log(s === 'active' ? green(`  https://${h} is live`) : `  https://${h}: ${s} ${dim('(certificate usually takes 5-15 minutes; check the Custom domains tab)')}`);
  }
  return allOk;
}

// Exact manual steps: no API token, or DNS not on Cloudflare.
export function printSteps({ project, subdomain, domain, attached = false, noToken = false }) {
  const apex = domain.split('.').length === 2;
  const www = apex ? `www.${domain}` : domain;
  const line = (s = '') => console.log(s);
  line(bold(`\nHow to connect ${domain}:`));
  if (noToken) {
    line(dim('(Add CLOUDFLARE_API_TOKEN to .env and deploy --prod does steps 2-3 itself. See README.)'));
  }
  line(`
A) Their domain's DNS is (or can be moved) on Cloudflare  [recommended: works for ${domain} AND ${www}]
   1. Cloudflare dashboard > Add a domain > "${apex ? domain : domain.split('.').slice(-2).join('.')}" > Free plan. Check the imported
      records (keep any MX/TXT records: those run their email). At their registrar (where
      they bought the domain), replace the nameservers with the two Cloudflare shows you.
      Wait until the domain shows "Active" in Cloudflare (minutes to a few hours).
   2. Workers & Pages > ${project} > Custom domains > Set up a custom domain > ${domain}
      > Continue > Activate domain.${apex ? ` Repeat for ${www}.` : ''}
   3. Cloudflare adds the DNS records itself. Done when both show "Active".

B) Keep their DNS where it is (www only)
   1. Set "domain": "${www}" in site.json and run: npm run deploy -- <slug> --prod
   2. At their registrar's DNS settings add:  CNAME  www  ->  ${subdomain}
   3. ${attached ? `${www} is already attached to the project.` : `Workers & Pages > ${project} > Custom domains > Set up a custom domain > ${www}.`}
   4. At the registrar, forward ${apex ? domain : 'the bare domain'} to https://${www} (301, "forward with path").

C) You register a new domain for them
   1. Cloudflare dashboard > Domain Registration > Register Domains > buy it (at cost, about
      $10/yr). Use the CLIENT's name and contact details so they own it.
   2. Set "domain" in site.json and run deploy --prod: it is already in your account,
      so everything is automatic (with the API token) or follow A2-A3.`);
}
