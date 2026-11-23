# Garam Dibba — Security audit

Date: 24 November 2026 · Branch: `online-ordering` · Scope: this repository, the Supabase **test** project, local builds.
No production systems, real payments or refunds were touched.

## 1. Architecture

| Part | Technology |
|---|---|
| Web app | Next.js 16.4 (App Router, JavaScript), React 19, hosted on Vercel |
| Auth | Supabase Auth: passwordless email OTP / magic link (PKCE). TOTP 2-step login for admins |
| Database | Supabase Postgres with Row Level Security. The server uses the service-role key; browsers use the publishable key |
| Storage | Supabase Storage, private bucket `proofs` (rider proof photos, report photos) |
| Realtime | Supabase Realtime on `deliveries` and `rider_locations` (RLS-filtered) |
| Payments | Razorpay Standard Checkout (orders API, signature check, webhook) |
| Maps | Leaflet + OpenStreetMap tiles, Nominatim search, OSRM / Google Distance Matrix (server) |
| Email | Supabase Auth via Resend SMTP |
| Tenancy | Single restaurant (no multi-tenant isolation needed) |

## 2. Attack surface inventory

**Public pages** (static): `/`, `/menu`, `/meal-plans`, SEO pages, `/about`, `/contact`, policy pages, `/manifest.webmanifest`, `/sitemap.xml`.

**Public, dynamic**: `/order` (steps 1–5 work signed out), `/login`, `/auth/callback` (GET, PKCE code), `/auth/signout` (POST), `/api/razorpay/webhook` (POST, signed).

**Signed-in pages**: `/orders`, `/orders/[id]`, `/orders/[id]/receipt`, `/account`, `/account/security`, `/company` (HR only), `/rider` (rider/admin), `/admin` (admin + 2-step).

**Server actions** (callable directly by anyone who can load the page, so every one re-checks auth on the server):

| File | Actions | Who |
|---|---|---|
| `src/app/order/actions.js` | checkLocation, joinWaitlist, getSlotLoad | anyone (rate-limited) |
| | getCheckoutProfile, createOrder | signed-in |
| `src/lib/actions/payment.js` | confirmPayment | signed-in, Razorpay signature |
| `src/app/orders/[id]/actions.js` | skipBox, pausePlan, resumePlan, changeSlot, reportBox | order owner (or verified admin) |
| `src/app/account/actions.js` | updateProfile, updatePreferences, savePin, join/create/leaveCompany | signed-in |
| `src/app/company/actions.js` | updateLimits, regenerateCode, setMemberRole, removeMember, startTopup | HR of that company |
| `src/app/rider/actions.js` | startDelivery, markDelivered, markMissed | assigned rider or verified admin |
| `src/app/admin/actions.js` | all kitchen admin actions | verified admin (role + aal2) |

**Browser → Supabase directly** (publishable key + user JWT, governed only by RLS/grants): selects on own rows; riders upsert their own `rider_locations`; realtime subscriptions.

**Outbound**: Razorpay API, OSRM / Google Distance Matrix (server), Nominatim and OSM tiles (browser), Supabase, Resend, Google Tag Manager.

## 3. Threat model

| Actor | Goal | Main controls |
|---|---|---|
| Anonymous attacker | Read data, free food, spam, run up API bills | RLS deny-by-default, server-side pricing, signed webhook, rate limits |
| Malicious customer | Pay less, see others' orders, become admin | Server recalculates every price; ownership checks; no browser write access to orders/profiles/roles |
| Compromised customer account | Same as above | Same; no stored cards |
| Compromised admin email | Take over Kitchen admin | TOTP 2-step login required in the app **and** the database |
| Rogue rider | Fake deliveries, track customers | Only assigned drops; GPS + photo proof; location cleared when idle |
| Rogue HR | Spend other companies' money | All HR actions scoped to own `company_id` |
| Payment fraud | Replay, amount change, fake success | Razorpay signature + server re-fetches payment (order, amount, currency, captured) + idempotent DB transition |
| Bots | Waitlist spam, code brute force, Google API abuse | Shared Postgres rate limiter keyed on user and platform IP |

## 4. Findings

Severity: P0 critical · P1 high · P2 medium · P3 low.

| # | Sev | Finding | Location | Status |
|---|---|---|---|---|
| 1 | P1 | **Open redirect after sign-in**: `next=/\evil.com` passed the `startsWith('/')` check; browsers treat `\` as `/`, so the magic link could send a user to an attacker's site | `src/app/auth/callback/route.js`, `src/app/login/page.jsx` | **Fixed**: `src/lib/safeRedirect.js`; tested |
| 2 | P1 | **Payment confirmed on signature alone**: amount, currency and capture status were never checked with Razorpay | `src/lib/payments.js` | **Fixed**: payment fetched from Razorpay; order, amount (paise), currency and `captured` verified first; mismatches logged and rejected |
| 3 | P1 | **Admin = email + one-time code only**; the database's `is_admin()` also trusted role alone, so a stolen email inbox meant full customer data access | `src/lib/auth.js`, `supabase/schema.sql` | **Fixed in code** (TOTP enrolment, aal2 enforced on every admin page and action). **Database part needs `003_security.sql` to be run** (test 9 in RLS suite fails until then) |
| 4 | P1 | Vulnerable dependencies: Next.js (critical: cache poisoning / `use cache` leak), sharp (high), source-map-js (high) | `package-lock.json` | **Fixed**: `npm audit fix`, now 0 known vulnerabilities |
| 5 | P2 | No rate limiting on public actions: road-distance lookups (Google API cost), waitlist spam, company-code brute force, order spam | server actions | **Fixed**: `src/lib/rateLimit.js` + `rate_limit_hit()` (needs `003_security.sql`; fails open until then) |
| 6 | P2 | No security headers (CSP, HSTS, frame, nosniff, permissions) | `next.config.mjs` | **Fixed**; tested |
| 7 | P2 | Report resolution could be applied twice (double refund / two make-up boxes) on a double click | `src/app/admin/actions.js` | **Fixed**: atomic claim (`status = 'open'` update) before acting |
| 8 | P2 | No audit trail for role changes, wallet changes, price changes, refunds, payment/webhook failures | — | **Fixed**: `security_events` table + `src/lib/securityLog.js` (needs `003_security.sql`) |
| 9 | P2 | Webhook: no body size limit, no event allowlist, settled even on unexpected payloads | `src/app/api/razorpay/webhook/route.js` | **Fixed**: 256 KB limit, `payment.captured`/`order.paid` only, payload validated, amount re-checked |
| 10 | P3 | Cross-site logout (CSRF) possible | `src/app/auth/signout/route.js` | **Fixed**: Origin check |
| 11 | P3 | Upload type taken from browser MIME | `src/lib/orderData.js` | **Fixed**: magic-byte check (JPEG/PNG/WebP only), server-generated paths, private bucket |
| 12 | P3 | Rider's last GPS point kept forever | `rider_locations` | **Fixed**: deleted when the rider has nothing out for delivery |
| 13 | P3 | `X-Powered-By` header, browser source maps | `next.config.mjs` | **Fixed** |
| 14 | P2 | ADMIN_EMAILS auto-promotes an email to admin | `src/lib/auth.js` | **Mitigated**: only confirmed emails, logged, and still needs 2-step login. Recommendation: empty `ADMIN_EMAILS` after both admins are set up |
| 15 | P1 | Supabase secret key and Razorpay test secret were pasted into a chat during setup | (out of repo) | **Open — rotate** (see checklist). Not found in git history or browser bundles |
| 16 | P3 | Supabase auth cookies are readable by JavaScript (design of `@supabase/ssr`) | — | **Accepted**: CSP + React escaping reduce XSS risk |
| 17 | P3 | CSP must allow `'unsafe-inline'` scripts (Next.js inline scripts, no nonces) | `next.config.mjs` | **Accepted** for now; see REMAINING_RISKS |

Items checked and found sound: server-side pricing of meals, plans, add-ons and delivery fees (browser values ignored, unit tested); order ownership checks on every order page and action; RLS denies anonymous reads and cross-customer reads (tested); browsers cannot update profiles, orders or call money functions (tested); HR actions are scoped to the HR's own company; no `eval`, no raw HTML from user data (only static JSON-LD with `<` escaped); PostgREST queries are parameterised by the client library; no passwords stored (passwordless).

Not applicable: password hashing/recovery (no passwords), coupons (none), cash on delivery (none), multi-tenant isolation (single restaurant).

### Second, independent review
A separate reviewer re-checked every privileged path. No critical or high issues; nine medium/low issues were found and **all fixed** (details in `SECURITY_TEST_RESULTS.md`, section 6):
pause/skip race (extra free box), unpaid orders paid late bypassing cutoffs and capacity, duplicate report refunds, refund amount overwritten on cancel, slot change ignoring capacity, duplicate add-on lines bypassing stock, employees reading the company join code, Google Tag Manager on staff pages, riders starting future deliveries.

## 5. Verdict
**CONDITIONAL GO** for the test link, and for launch once the items under "Must do" in `REMAINING_RISKS.md` are done (run migrations 002–004, rotate the pasted keys, admins enrol 2-step login, one end-to-end test payment). This is not a guarantee of security; an independent penetration test is recommended.
