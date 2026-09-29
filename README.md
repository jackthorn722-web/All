# DialedIn Sites — Operating Plan & Decision Log

**Venture:** DialedIn Sites — professionally built one-page websites for local service
businesses, delivered in 48 hours, $249 flat.

**Operator:** Claude (this repo's agent) builds and maintains everything.
**Owner:** Jack (17) — approves outbound messages, forwards replies. ≤30 min/week.
**Payments:** parent/guardian-owned account (required — see Legal, below).
**Market:** Utah County, UT (Provo, Orem, Lehi, Spanish Fork, Springville,
Payson, American Fork, Pleasant Grove, Santaquin, Eagle Mountain).
**Budget:** $200 available; ~$11 spent (dialedinsites.com domain, 2026-07-13).

---

## Why this model won

Decision made 2026-07-11 against these criteria: expected profit, startup speed,
risk, competition, scalability, required human effort, and legality for a
17-year-old operator.

| Criterion | Evidence / reasoning |
|---|---|
| Expensive, urgent problem | Local businesses routinely pay $900–$1,600 for a basic one-page site (markbrinker.com, websitebuilderexpert.com 2025–26 pricing guides). Businesses with no site or a broken site lose customers daily. |
| Price advantage | $249 flat undercuts the market 4–6x while still being ~100% margin: the site is built by AI, hosted free (GitHub Pages/Netlify), only cost is an optional ~$12 domain. |
| Speed to first sale | No product to build in advance. One good outreach batch to businesses with visibly bad/missing sites can convert in days. |
| Fulfillment ≈ zero human time | Claude builds each site from an intake form. Jack's role: forward the reply, approve the draft, send the delivery email. |
| Legal at 17 | Doing web design work as a minor is legal. Only the payment account needs an 18+ owner (Stripe requires the account owner to be 18+; a guardian owns it, the teen operates the business). |
| Scalable | Each sale is independent; capacity is limited only by leads, not labor. Upsell path: $10–20/mo "keep it updated" retainer = recurring revenue. |

**Models considered and rejected:**
- *Digital templates/study guides on marketplaces* — crowded, slow discovery, same
  payment-age problem, lower price points. Kept as fallback (see Pivot rules).
- *Freelance platforms (Upwork/Fiverr)* — Upwork is 18+; Fiverr payouts
  effectively require adult payment rails; platforms take 20%; slow review-building.
- *Local physical services* — real money but violates the ≤30 min/week constraint.
- *Anything speculative (crypto, flipping, ads arbitrage)* — excluded by the
  risk boundary.

## The math

- Price: $249/site. Cost of goods: $0–12. Payment processing ~3% (~$7.50).
- Net per sale: ≈ $230–241.
- Conservative 30-day target: 3–6 sales = **$690–$1,450 net**.
  First sale target: within 7–10 days of outreach starting.
- Every figure in [LEDGER.md](LEDGER.md) is verified-only. Current verified profit: **$0**.

## 72-hour launch plan

- **Hour 0–24 (DONE 2026-07-11):** offer, pricing, positioning, landing page,
  outreach scripts, lead criteria, SOP, ledger.
- **Hour 24–48 (DONE 2026-07-11):** inputs received (Utah County / $200 /
  parent confirmed). Lead research complete: 21 candidates screened, 11
  verified leads with per-lead evidence and paste-ready messages in
  [outreach/leads/utah-county-batch-1.md](outreach/leads/utah-county-batch-1.md).
  Landing page finalized in `docs/` with contact email, ready for GitHub Pages.
- **Hour 48–72 (Jack's 30 min):** parent creates PayPal Business account;
  enable GitHub Pages (Settings → Pages → deploy from branch → `/docs`);
  spot-check and send batch-1 messages.
- **Then:** repeat weekly. Each reply → intake → Claude builds site → deliver →
  invoice → log in ledger.

## Repo map

| Path | What it is |
|---|---|
| [LEDGER.md](LEDGER.md) | Verified revenue/expenses/profit. The scoreboard. |
| [offer/OFFER.md](offer/OFFER.md) | Offer, pricing, positioning, objection handling |
| [docs/index.html](docs/index.html) | DialedIn Sites landing page (live at dialedinsites.com) |
| [outreach/templates.md](outreach/templates.md) | Outreach scripts (email, follow-ups, close, delivery) |
| [outreach/lead-criteria.md](outreach/lead-criteria.md) | How leads are found and qualified |
| [SOP.md](SOP.md) | The whole operation in 30 min/week, plus pivot rules |
| [CLAUDE.md](CLAUDE.md) | Site pipeline conventions and exact commands |
| `clients/<slug>/` | One folder per client: `site.json` + `images/` |
| `templates/` | Astro base template (every section) + industry variants |
| `lib/`, `scripts/` | Spec schema/validation and the `npm run` commands |
| [kit/](kit/) | The standalone HTML template kit (Gumroad product, not the pipeline) |

## Add a new client in 30 minutes

The site pipeline turns one filled-out `site.json` into a finished static site. You need
Node 22.12+ ([nodejs.org](https://nodejs.org), LTS installer) and, once, `npm install` in this folder.
Every command works the same in PowerShell, cmd or VS Code's terminal on Windows.

**Before the call (2 min)**: pick a short slug (lowercase, dashes ok) and the closest template:

```
npm run new -- twintuned --template detailer
```

(If PowerShell ever says "Missing --template", `npm run new -- twintuned detailer` does the same.) This creates `clients/twintuned/site.json` (every unknown is a `TODO`), labeled placeholder photos
in `clients/twintuned/images/`, and prints the **intake checklist**: every field to collect, required
ones starred. Keep it open during the call.

**On the call (15 min)**: go down the checklist. Ask them to text or email 5-10 photos (best work,
before/afters, one of themselves, the logo). Big phone photos are fine; iPhone photos must be JPG, not
HEIC (Settings > Camera > Formats > Most Compatible). Read them the default services and FAQ answers and
note changes. Only mark licensed/insured if they confirm it, and only use real reviews, word for word.

**Fill it in (10 min)**: open `site.json` in VS Code (it autocompletes and underlines mistakes).
Replace every `TODO`, drop their photos into `images/`, point the image fields at them, and delete the
`placeholder-*.jpg` files. Anything you leave out of `copy`, `services` or `faq` uses the template's
default copy. Then:

```
npm run check -- twintuned     # lists every missing field and leftover placeholder by exact name
npm run dev -- twintuned       # live preview at http://localhost:4321, updates as you edit
```

Keep going until `check` says **READY**.

**Build (1 min)**:

```
npm run build -- twintuned     # finished static site in dist/twintuned/
npm run preview -- twintuned   # look at exactly what will be deployed
```

The contact form sends to the Web3Forms inbox in `.env` (copy `.env.example` to `.env`; add
`WEB3FORMS_KEY_TWINTUNED=...` to route one client's leads to their own inbox).

**Send the preview (1 min)**: `npm run deploy -- twintuned` and text the client the link it prints.

## Deploy and go live

Every client gets its own Cloudflare Pages project, named after the slug. Hosting is free.

### One-time setup (5 minutes)

1. Run `npm install` in this folder (again whenever you update the repo: deploy needs `wrangler`,
   which it installs).
2. Make a free Cloudflare account at [dash.cloudflare.com](https://dash.cloudflare.com).
3. **Account ID**: in the dashboard open *Workers & Pages*; "Account ID" is on the right. Put it in
   `.env` as `CLOUDFLARE_ACCOUNT_ID=...`.
4. **Cloudflare API token** (lets deploy connect domains by itself): *My Profile > API Tokens >
   Create Token > Create Custom Token*, with these permissions:
   - Account | Cloudflare Pages | Edit
   - Zone | DNS | Edit
   - Zone | Zone | Read
   - Account Resources: your account. Zone Resources: *All zones from an account* (so new client
     domains work without editing the token).

   Save it in `.env` as `CLOUDFLARE_API_TOKEN=...`. (Notepad may save the file as `.env.txt`; it
   must be exactly `.env`.) No token? Deploy still works: the first time, it opens the browser to
   sign in to Cloudflare, and it prints the domain steps for you to click through.

### Preview for the client

```
npm run deploy -- twintuned
```

Builds, creates the Pages project on the first run, uploads, and prints
`https://preview.twintuned.pages.dev`. Text that link to the client. It stays the same every time you
redeploy a preview, and search engines are told not to index it. (If `twintuned.pages.dev` was
already taken by someone else, Cloudflare adds a suffix; deploy always prints the real address.)

### Production

```
npm run deploy -- twintuned --prod
```

Refuses while `check` still lists placeholders or there is no Web3Forms key. Otherwise it deploys the
live site and, if `site.json` has a `"domain"`, connects it. (If PowerShell drops `--prod`, use
`npm run deploy -- twintuned prod`.)

With the API token and the domain's DNS in your Cloudflare account, it attaches both
`twintuneddetailing.com` and `www.twintuneddetailing.com` and creates their DNS records. It never
deletes an existing record: if an old site's record is in the way, it prints exactly what to change.
Security certificates take 5-15 minutes; run deploy --prod again (or look at *Workers & Pages >
twintuned > Custom domains*) to see the status. Without a domain, `https://twintuned.pages.dev` is
the live address. Without the token, deploy prints the same steps below with the real names filled in.

### Connecting the domain: the two cases

**The client already owns the domain** (GoDaddy, Namecheap, Squarespace...). The registrar steps
need their login: have them do those with you on the phone.

- *Recommended: move the DNS to Cloudflare.* This handles both `domain.com` and `www.domain.com`.
  1. Cloudflare dashboard > *Domains > Onboard a domain* > their domain > *Free* plan.
  2. Screenshot every record at their current DNS provider first. Cloudflare's import can miss
     some: add anything missing, especially MX, TXT (SPF/DKIM/DMARC) and mail CNAMEs. Those run
     their email. Keep mail records *DNS only*.
  3. If DNSSEC is on at their registrar, turn it off first (skipping this can take the site and
     email offline). You can turn it on again later in Cloudflare.
  4. At the registrar, replace the nameservers with the two Cloudflare shows.
  5. When the domain shows *Active* in Cloudflare (up to 24 hours), run
     `npm run deploy -- <slug> --prod`. With the API token it connects everything; without it,
     follow the dashboard steps it prints.
- *Keep the DNS where it is (www only).* Set `"domain": "www.theirdomain.com"` and run deploy
  `--prod` (with the token it attaches the domain; without it, *Workers & Pages > project > Custom
  domains > Set up a custom domain*). Only then, at their registrar, change the `www` record to
  `CNAME www -> <slug>.pages.dev`, and forward the bare domain to `https://www.theirdomain.com`.
  Deploy prints these steps with the real names.

**You register a domain for them.** Cloudflare dashboard > *Domain Registration > Register Domains*
(at cost, about $10 a year). Use the client's name and contact details so they own it. Right after,
the client gets a "verify your email" message (an ICANN rule): they must click it or the domain is
suspended after a few days, so do it together on the call. Auto-renew is on and billed to your
account: agree who pays the yearly renewal. The domain is already in your account, so set
`"domain"` and run `npm run deploy -- <slug> --prod`.

## Legal & boundaries (standing rules)

- Payment account must be owned by a parent/guardian (Stripe/PayPal/Gumroad all
  require an 18+ account owner). No workarounds.
- Contracts with a minor are voidable — keep engagements small, prepaid or
  pay-on-delivery, no long-term obligations.
- Outreach is low-volume, personalized, truthful, CAN-SPAM compliant (real
  identity, no deception, honor opt-outs). No mass spam, ever.
- No claims of revenue anywhere unless the money has actually landed.
- Income is taxable; parent/guardian should track for tax filing (ledger keeps
  the records).
