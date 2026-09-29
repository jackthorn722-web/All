// Custom domain for a client's Pages project, run by `npm run deploy -- <slug> --prod`.
// With CLOUDFLARE_API_TOKEN: attach the domain (+ its www/apex twin) to the
// project and, when the domain's DNS is in this Cloudflare account, create the
// CNAME records. Anything it can't do safely is printed as exact steps.
import { bold, green, yellow, dim } from './cli.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Suffixes where the registrable domain has three labels (smith.co.uk).
const TWO_LABEL_SUFFIXES = ['co.uk', 'org.uk', 'me.uk', 'com.au', 'net.au', 'org.au', 'co.nz', 'com.mx', 'com.br', 'co.za', 'co.jp', 'com.sg', 'co.in'];

// "www.x.com" -> { apex: "x.com", label: "www", apexOrWww: true, www: "www.x.com" }
// "book.x.com" -> { apex: "x.com", label: "book", apexOrWww: false, ... }
export function splitDomain(domain, zoneName) {
  const parts = domain.split('.');
  const apex = zoneName ?? parts.slice(TWO_LABEL_SUFFIXES.includes(parts.slice(-2).join('.')) ? -3 : -2).join('.');
  const label = domain === apex ? '' : domain.slice(0, -apex.length - 1);
  return { apex, label, apexOrWww: label === '' || label === 'www', www: `www.${apex}` };
}

// "www.example.com" -> ["www.example.com", "example.com"]: candidates for the zone.
function zoneCandidates(host) {
  const parts = host.split('.');
  return parts.slice(0, -1).map((_, i) => parts.slice(i).join('.')).filter((n) => n.includes('.'));
}

async function findZone(api, host) {
  for (const name of zoneCandidates(host)) {
    const zones = await api.findZone(name);
    if (zones.length) return zones[0];
  }
  return null;
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
  const existing = await api.listDomains(project);
  if (!existing.some((d) => d.name === host)) await api.addDomain(project, host);
}

const BAD = ['error', 'blocked', 'deactivated'];
const problemOf = (d) => d?.validation_data?.error_message || d?.verification_data?.error_message || '';

// Polls until every host is active (about 30 s at most). A host in an error
// state gets one validation retry.
async function waitForActive(api, project, hosts) {
  const result = {};
  const retried = new Set();
  console.log(dim(`  Waiting up to 30 s for Cloudflare to confirm...`));
  for (let i = 0; i < 6; i++) {
    for (const h of hosts) {
      const d = await api.getDomain(project, h);
      result[h] = d;
      if (['error', 'deactivated'].includes(d?.status) && !retried.has(h)) {
        retried.add(h);
        await api.retryDomain(project, h);
      }
    }
    if (hosts.every((h) => result[h]?.status === 'active') || i === 5) break;
    await sleep(5000);
  }
  return result;
}

// Returns 'active' | 'pending' (Cloudflare is finishing) | 'action' (steps
// printed for the owner) | 'broken' (a DNS conflict or domain error to fix).
export async function connectDomain({ api, project, subdomain, domain }) {
  console.log(bold(`\nCustom domain: ${domain}`));
  const zone = await findZone(api, domain);
  const { apex, label, apexOrWww, www } = splitDomain(domain, zone?.name);
  const where = `Workers & Pages > ${project} > Custom domains`;

  if (!zone) {
    // DNS lives elsewhere (GoDaddy, Namecheap, ...). A subdomain like www can be
    // attached now and goes live once the CNAME exists; a bare domain can't.
    if (label) {
      await attach(api, project, domain);
      const d = await api.getDomain(project, domain);
      if (d?.status === 'active') {
        console.log(green(`  https://${domain} is live`));
        return 'active';
      }
      console.log(`  ${domain} is attached to the project (status: ${d?.status ?? 'unknown'}) and waits for its DNS record.`);
    }
    console.log(yellow(`  ${apex} is not a domain in this Cloudflare account, so its DNS can't be set automatically.`));
    printSteps({ project, subdomain, domain, token: true, attached: Boolean(label) });
    return 'action';
  }

  const hosts = apexOrWww ? [domain, domain === apex ? www : apex] : [domain];
  const ok = [];
  let broken = false;
  for (const host of hosts) {
    await attach(api, project, host);
    const dns = await ensureCname(api, zone, host, subdomain);
    if (dns.ok) {
      ok.push(host);
      console.log(green(`  ${host}: attached, ${dns.note}`));
    } else {
      broken = true;
      const name = host === zone.name ? '@' : host.slice(0, -zone.name.length - 1);
      console.log(yellow(`  ${host}: attached, but its DNS already has: ${dns.conflict.join(', ')}`));
      console.log(`    Fix: Cloudflare dashboard > ${zone.name} > DNS > Records: delete that record, add`);
      console.log(`    CNAME  ${name}  ->  ${subdomain}  (Proxied), then run npm run deploy -- ${project} --prod again.`);
    }
  }

  if (zone.status !== 'active') {
    const ns = zone.name_servers?.length ? zone.name_servers.join(' and ') : 'the two nameservers Cloudflare shows for it';
    console.log(yellow(`\n  ${zone.name} is in your Cloudflare account, but its nameservers haven't switched yet.`));
    console.log(`  At the registrar, set the nameservers to ${ns} (turn DNSSEC off there first if it is on).`);
    console.log(`  It can take up to 24 hours. Then run npm run deploy -- ${project} --prod again.`);
    return broken ? 'broken' : 'action';
  }

  if (!ok.length) return 'broken';
  const status = await waitForActive(api, project, ok);
  let allActive = true;
  for (const h of ok) {
    const d = status[h];
    if (d?.status === 'active') {
      console.log(green(`  https://${h} is live`));
      continue;
    }
    allActive = false;
    if (BAD.includes(d?.status)) {
      broken = true;
      console.log(yellow(`  https://${h}: ${d.status}${problemOf(d) ? `: ${problemOf(d)}` : ''}`));
      console.log(`    ${d.status === 'blocked' ? 'Cloudflare blocked this domain; contact Cloudflare support.' : `Validation was retried. Check ${where}, then run deploy --prod again.`}`);
    } else {
      console.log(`  https://${h}: ${d?.status ?? 'unknown'} ${dim(`(the certificate usually takes 5-15 minutes; status: ${where})`)}`);
    }
  }
  return broken ? 'broken' : allActive ? 'active' : 'pending';
}

// Exact manual steps: DNS not on Cloudflare yet, or no API token.
export function printSteps({ project, subdomain, domain, token = false, attached = false }) {
  const { apex, label, apexOrWww, www } = splitDomain(domain);
  const host = apexOrWww ? www : domain; // what option B serves
  const hostLabel = apexOrWww ? 'www' : label;
  const deployProd = `npm run deploy -- ${project} --prod`;
  const both = apexOrWww ? `${apex} and ${www}` : domain;
  const line = (s = '') => console.log(s);
  line(bold(`\nHow to connect ${domain}:`));
  if (!token) line(dim('(With CLOUDFLARE_API_TOKEN in .env, deploy --prod does the Cloudflare side itself. See README.)'));
  line(`
A) Move their domain's DNS to Cloudflare  [recommended: covers ${both}]
   1. Cloudflare dashboard > Domains > Onboard a domain > "${apex}" > Free plan.
   2. Screenshot every record at their current DNS provider first. Compare with what Cloudflare
      imported and add anything missing, especially MX, TXT (SPF/DKIM/DMARC) and mail CNAMEs:
      those run their email. Keep mail records "DNS only".
   3. If DNSSEC is on at their registrar (where they bought the domain), turn it off first.
      You can turn it back on later in Cloudflare.
   4. At the registrar, replace the nameservers with the two Cloudflare shows.
   5. Wait until the domain shows "Active" in Cloudflare (can take up to 24 hours).`);
  if (token) line(`   6. Run ${deployProd} again: it attaches ${both} and creates the DNS records.`);
  else
    line(`   6. ${`Workers & Pages > ${project} > Custom domains > Set up a custom domain > ${domain} > Continue >`}
      Activate domain.${apexOrWww ? ` Repeat for ${domain === apex ? www : apex}.` : ''} Cloudflare adds the DNS records; done when all show "Active".`);
  line(`
B) Keep their DNS where it is  [${host} only]`);
  let n = 1;
  const attachByHand = `Workers & Pages > ${project} > Custom domains > Set up a custom domain > ${host}.`;
  if (domain !== host) {
    line(`   ${n++}. Set "domain": "${host}" in site.json and run ${deployProd}${token ? `: it attaches ${host} to the project.` : '.'}`);
    if (!token) line(`   ${n++}. ${attachByHand}`);
  } else if (attached) line(`   ${n++}. ${host} is already attached to the project.`);
  else if (token) line(`   ${n++}. Run ${deployProd}: it attaches ${host} to the project.`);
  else line(`   ${n++}. ${attachByHand}`);
  line(`   ${n++}. Then, at their registrar's DNS settings: change the existing "${hostLabel}" record (or add one) to
      CNAME  ${hostLabel}  ->  ${subdomain}   and delete any other "${hostLabel}" records.`);
  if (apexOrWww) line(`   ${n++}. At the registrar, forward ${apex} to https://${www} (permanent 301, forward with path).`);
  line(`
C) You register a new domain for them
   1. Cloudflare dashboard > Domain Registration > Register Domains > buy it (at cost, about
      $10 a year). Use the CLIENT's name and contact details so they own it.
   2. Right after, the client gets a "verify your email" message (an ICANN rule). They must
      click it within days or the domain is suspended: do it together on the call if you can.
      Auto-renew is on and billed to your account: agree who pays the yearly renewal.
   3. It is already in your account: set "domain" in site.json and run ${deployProd}${token ? '.' : ', then A6.'}`);
}
