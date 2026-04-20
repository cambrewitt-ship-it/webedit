---
name: Partner/Reseller Program
description: White-label reseller arm added to WebEdit — key architecture and data notes
type: project
---

White-label partner program was added (April 2026).

**Key files:**
- `data/resellers.json` — reseller records (must be committed to GitHub repo, same as clients.json)
- `config/resellers.ts` — Reseller type + helpers
- `app/partner/` — login + dashboard pages
- `app/partners/` — public marketing/landing page for recruiting resellers
- `app/api/reseller-auth/route.ts` — reseller login
- `app/api/reseller/clients/route.ts` — CRUD for reseller's clients
- `app/api/reseller/checkout/route.ts` — wholesale Stripe checkout
- `app/api/reseller/register/route.ts` — self-registration (creates pending)
- `app/api/admin/resellers/route.ts` — admin CRUD for resellers
- `app/api/client/change-password/route.ts` — client self-service password change
- `lib/github.ts` — shared GitHub read/write helpers (extracted from admin route)

**Data model additions:**
- `Client` now has: `resellerId?`, `resellerBrandName?`, `resellerBrandLogo?`
- `SessionData` now has: `resellerId?`
- `config/packs.ts` has `WHOLESALE_PACKS` (30% off retail for resellers)

**Pricing:**
- Resellers pay $49 NZD/client/year (manual billing for now, admin manages)
- Wholesale token packs: NZ$17/34/55 vs retail NZ$25/49/79

**IMPORTANT — data/resellers.json must be in GitHub:**
The app reads/writes JSON from GitHub (same as clients.json). After building, resellers.json must be committed to the GitHub repo (APP_GITHUB_REPO). If it doesn't exist, all reseller API calls will 500.

**Flow:**
1. Reseller applies at /partners → pending record created in resellers.json
2. Admin sees pending in /admin → Partners tab → clicks Approve → temp password shown once
3. Admin sends password to reseller manually
4. Reseller logs in at /partner → dashboard at /partner/dashboard
5. Reseller creates clients (auto-generates temp password shown once)
6. Reseller shares client link + temp password to their end-client
7. End-client logs in, can change password from editor header

**Why:** How: resellers.json needs to exist on GitHub before any partner API calls work.
