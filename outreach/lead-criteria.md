# Lead sourcing & qualification

Claude builds the lead list once the target city is known. Target: 15–25
qualified leads per weekly batch.

## Where leads come from

Google Maps / Google Search for each trade + town combination. Trades, in
priority order (high ticket-value per customer, high urgency, low web-savvy):

1. Pressure washing / exterior cleaning
2. Landscaping / lawn care
3. Auto detailing (mobile especially)
4. House cleaning
5. Handyman / junk removal
6. Painting
7. Pet grooming / dog walking
8. Tutoring / music lessons

## Qualification — a lead makes the list only if ALL are true

- [ ] Active business: reviews within the last ~6 months, or recent FB posts
- [ ] 4.0+ stars with 5+ reviews (they're good at the work — easiest to sell for)
- [ ] Website problem is *visible and specific*: no site at all, site link
      dead, not mobile-friendly, or clearly abandoned. The evidence goes into
      the outreach email — every message cites something real.
- [ ] Reachable: a public business email or contact form. (Public business
      contact info only — this is standard B2B outreach.)
- [ ] Local to the target city/region (credibility: "a student studio in {{town}}")

## Lead list format (`outreach/leads/{{city}}-batch-N.md`)

| Business | Trade | Town | Evidence of problem | Contact | Reviews | Status |
|---|---|---|---|---|---|---|

Status flow: `new → contacted → followed-up → replied → intake-sent → building → delivered → PAID / no / no-response`

Every status change also gets reflected in LEDGER.md counters.


## Deep-dive standard (adopted 2026-07-13, after two near-misses)

Every lead gets ALL of these before it enters a batch file:
1. Dedicated name search (not just the sweep that found it)
2. Closure/rebrand check: search "[name] [town] Yelp" and read for CLOSED flags
3. Phone hunt across directories (Yellow Pages, Buzzfile, Manta, BBB, Nextdoor,
   Wheree) — a found phone upgrades the lead to TEXT contact, which beats FB
4. If any website/domain surfaces: fetch it — dead or broken sites become
   "outdated site" pitches, not disqualifications
5. Email hunt (rarely public for these businesses, but check)

What Claude cannot see (Jack's 30-second job before sending): the Facebook
page itself (login wall) and the Google Business panel. Check: still active,
no website link in About, and click any website we cite to confirm the
evidence with your own eyes.
