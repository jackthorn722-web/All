// npm run deploy -- <slug>          preview for client approval
// npm run deploy -- <slug> --prod   production + custom domain
//
// Builds the site for the URL it will live at, makes sure the client's
// Cloudflare Pages project exists (project name = slug), uploads with
// wrangler and prints the link. --prod refuses placeholders and a missing
// form key, then connects site.json's "domain" (automatically with
// CLOUDFLARE_API_TOKEN in .env, otherwise it prints the exact steps).
import { enterRepoRoot, slugArgs, validateAndReport, fail, bold, green, yellow, dim } from '../lib/cli.js';
import { buildSite, printSummary, lockSlug } from '../lib/build.js';
import fs from 'node:fs';
import path from 'node:path';
import { formKeyFor, formKeyName, clientDir } from '../lib/client.js';
import { wrangler, wranglerInstalled, findProject, createProject, deployDir, cloudflareApi } from '../lib/cloudflare.js';
import { connectDomain, printSteps } from '../lib/domains.js';

enterRepoRoot();
const { slug, values, positionals } = slugArgs('deploy', { prod: { type: 'boolean' } });
// If "--prod" gets lost on the way through npm/PowerShell, "prod" works too.
const prod = Boolean(values.prod || positionals[1] === 'prod');
const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!wranglerInstalled()) fail('wrangler is not installed yet. Run: npm install   (needed once after updating this repo)');

// 1. The spec must be clean enough for where it is going.
const { errors, placeholders, data } = validateAndReport(slug, { full: prod });
if (errors.length) process.exit(1);
if (prod) {
  const blockers = [];
  if (placeholders.length) blockers.push(`${placeholders.length} placeholder(s) are still in site.json (listed above).`);
  if (!formKeyFor(slug)) blockers.push(`No Web3Forms key: add WEB3FORMS_KEY or ${formKeyName(slug)} to .env.`);
  if (blockers.length) fail(`Not deploying to production:\n  - ${blockers.join('\n  - ')}\nA preview works anytime: npm run deploy -- ${slug}`);
}
if (token && !accountId) fail('CLOUDFLARE_ACCOUNT_ID is missing from .env (Cloudflare dashboard > Workers & Pages: "Account ID" on the right).');
lockSlug(slug);

// 2. Signed in to Cloudflare? Without a token, wrangler signs in through the browser once.
if (!token) {
  const who = await wrangler(['whoami', '--json'], { show: false });
  if (who.code !== 0) {
    // wrangler login needs a browser and a person; without a terminal it would wait forever.
    if (!process.stdin.isTTY) fail('Not signed in to Cloudflare. Run "npx wrangler login" once in a terminal, or put CLOUDFLARE_API_TOKEN in .env.');
    console.log(bold('\nSign in to Cloudflare (a browser window opens; this happens once):'));
    const login = await wrangler(['login'], { interactive: true });
    if (login.code !== 0) fail('Cloudflare sign-in did not finish. Run the deploy again, or put CLOUDFLARE_API_TOKEN in .env.');
  }
}

// 3. The client's Pages project (created on first deploy).
console.log(dim(`\nCloudflare Pages project: ${slug}`));
let project;
try {
  project = await findProject(slug);
  if (!project) {
    console.log(`Creating Pages project "${slug}"...`);
    await createProject(slug);
    project = await findProject(slug);
  }
} catch (e) {
  fail(`${e.message}\n${accountId ? '' : 'If you have more than one Cloudflare account, set CLOUDFLARE_ACCOUNT_ID in .env.'}`);
}
if (!project) fail(`Pages project "${slug}" was not found after creating it. Check Workers & Pages in the Cloudflare dashboard.`);

// 4. Build for the exact URL it will be served from, then upload.
const branch = prod ? 'main' : 'preview';
const siteUrl = prod ? `https://${data.domain ?? project.subdomain}` : `https://${branch}.${project.subdomain}`;
console.log(`${prod ? 'Production' : 'Preview'} build for ${siteUrl}`);
const out = await buildSite(slug, { siteUrl, preview: !prod });
printSummary(out);
console.log('');
let deployed;
try {
  deployed = await deployDir(out, slug, branch);
} catch (e) {
  fail(e.message);
}
// Cloudflare decides what is production by the project's production branch
// (a project made outside this tool may not use "main").
const wrongBranch = (prod && deployed.environment && deployed.environment !== 'production') || (!prod && deployed.environment === 'production');
if (wrongBranch) {
  const what = prod ? 'That upload became a PREVIEW, not production' : 'This preview went LIVE as production';
  let fix;
  if (token) {
    try {
      await cloudflareApi({ token, accountId }).setProductionBranch(slug, 'main');
      fix = `Fixed: the project's production branch is now "main". Run: npm run deploy -- ${slug} --prod${prod ? '' : ' (to put the real site back)'}`;
    } catch (e) {
      fix = e.message;
    }
  } else {
    fix =
      `Projects deployed from the command line have no dashboard setting for this. Either add CLOUDFLARE_API_TOKEN to .env and deploy again\n` +
      `(deploy then fixes it), or delete the project (Workers & Pages > ${slug} > Settings > Delete) and deploy again; re-connect its domain afterwards.`;
  }
  fail(`${what}: project "${slug}" uses "${deployed.productionBranch}" as its production branch, not "main".\n${fix}`);
}

// 5. Where it is. Also remembered in clients/<slug>/deploys.json (the dashboard shows it).
function remember(kind, info) {
  const file = path.join(clientDir(slug), 'deploys.json');
  let log = {};
  try {
    log = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {}
  log[kind] = { ...info, at: new Date().toISOString() };
  fs.writeFileSync(file, JSON.stringify(log, null, 2) + '\n');
}
if (!prod) {
  const link = deployed.alias ?? siteUrl;
  remember('preview', { url: link });
  console.log(green(`\nPreview is up: ${bold(link)}`));
  console.log(`Send that link to the client for approval. It stays the same for every preview deploy.`);
  if (deployed.url) console.log(dim(`This exact version: ${deployed.url}`));
  if (placeholders.length) console.log(yellow(`Heads up: ${placeholders.length} placeholder(s) are visible on it (npm run check -- ${slug}).`));
  console.log(dim(`Search engines are told not to index previews. Going live: npm run deploy -- ${slug} --prod  (or: ... ${slug} prod)\n`));
  process.exit(0);
}

console.log(green(`\nProduction is up: ${bold(`https://${project.subdomain}`)}`));
remember('production', { url: `https://${project.subdomain}`, domain: data.domain ?? null });
if (!data.domain) {
  console.log(`No "domain" in site.json yet, so this is the site's address. Add one later and deploy --prod again.\n`);
  process.exit(0);
}
if (!token) {
  if (project.domains.includes(data.domain))
    console.log(`${data.domain} is connected to the project. Its status: Workers & Pages > ${slug} > Custom domains.\n`);
  else printSteps({ project: slug, subdomain: project.subdomain, domain: data.domain });
  process.exit(0);
}
let state;
try {
  state = await connectDomain({ api: cloudflareApi({ token, accountId }), project: slug, subdomain: project.subdomain, domain: data.domain });
} catch (e) {
  fail(`The site is live at https://${project.subdomain}, but connecting ${data.domain} failed:\n${e.message}`);
}
if (state === 'broken') fail(`The site is live at https://${project.subdomain}; ${data.domain} needs the fix above.`);
console.log('');
