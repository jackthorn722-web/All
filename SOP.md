# Standard Operating Procedure

## Division of labor

**Claude does (in Claude Code sessions on this repo):**
- Build and maintain the landing page and every client site
- Research and qualify leads, with cited evidence per lead
- Draft every outreach email, follow-up, intake, and delivery message
- Track everything in LEDGER.md; update this repo every session
- Diagnose and pivot when numbers say so (rules below)

**Jack does (≤30 min/week, in one sitting):**
1. Open the week's batch file in `outreach/leads/` (Claude will have drafted
   every email). Skim, veto any, send the rest. (~10 min)
2. Forward any replies into the next Claude session — or just paste them. (~5 min)
3. Approve draft sites before they're sent to clients. (~5 min)
4. When a client says "go live": send the payment request from the
   parent-owned account, confirm when money lands so it enters the ledger. (~5 min)

**Parent/guardian does (one time, ~15 min):**
- Create the payment account as owner (recommended: **PayPal Business** —
  fastest setup, invoicing built in, no coding needed; Stripe also fine).
  Jack operates day to day; the guardian owns it. This is the legal,
  ToS-compliant structure for a 17-year-old.

## Weekly cycle

| Day | What happens |
|---|---|
| Mon | Claude session: build/refresh lead batch + drafted emails, update ledger |
| Tue | Jack's 30 min: approve & send batch, forward replies |
| Wed–Thu | Claude builds any sold sites (48h clock) |
| Fri | Follow-ups drafted for Tuesday's non-responders (one follow-up max) |

## Fulfillment checklist (per client)

1. Reply "sure" received → send intake questions (template in outreach/templates.md)
2. Intake answers received → Claude builds site in `clients/{{business-slug}}/`
3. Deploy preview (GitHub Pages subpath or Netlify) → Jack approves → send preview to client
4. Revisions (max 2 rounds) → client approves
5. Connect domain → send payment request ($249) → **money lands** → log in LEDGER.md
6. One week later: SiteCare upsell ($15/mo)

## Pivot rules (checked every Monday)

- **50+ contacted, zero replies:** rewrite subject lines and evidence hooks; test
  a different trade mix. Diagnose before adding volume.
- **Replies but no closes after 5+ conversations:** price is not the issue at
  $249 with a free draft — the offer explanation is. Tighten the close script.
- **Day 21 with $0 verified profit:** activate fallback — package the site
  templates already built as a "local business website template kit" and sell
  on a marketplace via the guardian account, while keeping outreach running.
- **A client asks for more than a one-page site:** quote separately or decline.
  Scope creep kills the 48-hour promise.

## Template-to-client rule (never violated)

The Wasatch Lawn Co. sample (docs/sample/lawn.html) is a TEMPLATE with
fictional claims. When building a real client site from it, every claim is
replaced or deleted — never carried over automatically:
- "Licensed" / "insured" — only if the client confirms it in writing (intake)
- "Since YYYY" — client's real founding year or omit
- Prices — client's real prices or omit
- Guarantees ("on time or free") — only if the client explicitly offers it
- Reviews — client's real reviews with permission, or section omitted
- Service areas, hours, phone — from intake, verbatim
- Sample photos — replaced with the client's own project photos

## Standing boundaries (never violated, no exceptions)

- No sending anything external without Jack pressing send (or his explicit
  standing approval per batch).
- No payment collection except through the guardian-owned account.
- No revenue recorded until verified landed.
- One follow-up per lead, hard stop. Opt-outs honored instantly and logged.
- Claims in outreach must cite real, checkable evidence about the lead's site.
