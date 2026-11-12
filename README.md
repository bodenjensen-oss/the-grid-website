# thegridproduction.com

The live website for The Grid (Summit Point LLC, dba The Grid).

- Plain static site: HTML, CSS and JavaScript in `public/`. No build step.
- Hosted on Vercel. A push to `main` deploys to production; any other branch gets a preview link.
- `vercel.json` sets clean URLs (`/lasers` instead of `/lasers.html`), the security headers and asset caching, matching the site as it was deployed from the Mac.

## Where this came from

This repo started on Nov 12, 2026 as an exact copy of the live site, pulled from thegridproduction.com.
The original generator (`build.py` in `~/the-grid-lasers-site` on the Mac) is not in this repo yet.

**Before deploying from the Mac again:** apply the same copy changes there first, or the old wording comes back.
The full old → new list lives in the "Grid Website Copy" artifact.

## Editing

Change the files in `public/`, push to a branch, check the Vercel preview link, then merge to `main`.
