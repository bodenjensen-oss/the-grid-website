# thegridproduction.com

The live website for The Grid (Summit Point LLC, dba The Grid).

- Plain static site: HTML, CSS and JavaScript in `public/`. No build step.
- Hosted on Vercel. A push to `main` deploys to production; any other branch gets a preview link.
- `vercel.json` sets clean URLs (`/lasers` instead of `/lasers.html`), the security headers and asset caching, matching the site as it was deployed from the Mac.

## Where this came from

This repo started on Nov 12, 2026 as an exact copy of the live site, pulled from thegridproduction.com.
The original generator (`build.py` in `~/the-grid-lasers-site` on the Mac) is not in this repo yet.

**Before deploying from the Mac again:** apply the same copy changes there first, or the old wording comes back.
The full list of old and new wording lives in the "Grid Website Copy" artifact.

## Editing

Change the files in `public/`, push to a branch, check the Vercel preview link, then merge to `main`.

## Software sales and previews

The company site's publish root is `public`. Its `/design` page presents THE GRID: nine feature groups checked against `checks/qa/PARITY.md` in grid-unreal, three screen captures, four show renders, three engine renders, the packaged-build status and the previz service. `/software` redirects to `/design` (permanent redirect in `vercel.json`; the local preview has no redirects). Every company page links to https://beyondlights.net.

The software storefront has its own static publish root in `beyondlights`: `index.html`, `store.css`, `scripts/`, `assets/` and its own `vercel.json` with a self-only CSP and no analytics. It links back to https://thegridproduction.com/design. To publish it, create a second Vercel project from this repo with Root Directory set to `beyondlights`, then attach beyondlights.net to that project. Changing the company project's publish root would replace the company website.

Run `python tools/preview_sites.py` to preview the company site on http://127.0.0.1:4178 and the storefront on http://127.0.0.1:4179. The preview rewrites the links between the two domains to local URLs, strips the analytics scripts and resolves clean URLs. The Claude desktop app starts the same script from `.claude/launch.json` in the exports folder (configuration `grid-sites`). The public pages use pre-sale inquiry links to TheGrid@beyondlights.net. Sales are closed until the first packaged release passes its acceptance tests.

Captures and renders on both sites come from the development build. Each caption names its date. Vercel caches `/assets/` for 30 days, so changed media needs a new filename.

The storefront offers three options in the Ableton pattern: buy outright, pay monthly until owned, and a trial. The checkout behind them is the next build, on top of the ledger below, once prices and a payment provider are chosen.

Both sites use one product catalog, price snapshot per customer and product version, and ownership account. The offline accounting module in [billing/ownership.py](billing/ownership.py) accepts settled charges and refunds, quotes a one-time payoff or caps a monthly installment at the remaining balance, and handles processor retries by payment ID. A refund after completion goes to review and does not automatically restart billing. The seven [billing tests](billing/test_ownership.py) use temporary databases and sample integer amounts. Run them with `python billing/test_ownership.py`.

Before switching on sales, approve prices and terms, select the merchant account, authenticate customer accounts, and connect provider-verified settlement/refund events, cancellations and entitlement issuance. The offline ledger does not initiate charges. Both domains should direct buyers into the same provider checkout. The public storefront and its assets can be deployed independently of the ledger.
