# SiteSprint — Operating Plan & Decision Log

**Venture:** SiteSprint — professionally built one-page websites for local service
businesses, delivered in 48 hours, $249 flat.

**Operator:** Claude (this repo's agent) builds and maintains everything.
**Owner:** Jack (17) — approves outbound messages, forwards replies. ≤30 min/week.
**Payments:** parent/guardian-owned account (required — see Legal, below).
**Market:** Utah County, UT (Provo, Orem, Lehi, Spanish Fork, Springville,
Payson, American Fork, Pleasant Grove, Santaquin, Eagle Mountain).
**Budget:** $200 available; $0 spent; plan requires ~$0 up front.

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
| [site/index.html](site/index.html) | SiteSprint landing page, ready for GitHub Pages |
| [outreach/templates.md](outreach/templates.md) | Outreach scripts (email, follow-ups, close, delivery) |
| [outreach/lead-criteria.md](outreach/lead-criteria.md) | How leads are found and qualified |
| [SOP.md](SOP.md) | The whole operation in 30 min/week, plus pivot rules |

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
