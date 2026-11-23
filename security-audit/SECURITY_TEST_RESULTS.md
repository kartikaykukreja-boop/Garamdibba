# Security test results

Run on 24 November 2026 against a local **production build** (`next start`) and the Supabase **test** project.
No live keys, real payments or refunds were used. Re-run with:

```
npm test                                                  # unit
BASE_URL=http://localhost:3000 node --test tests/http.security.mjs
node --test tests/rls.security.mjs                        # test project only
```

## 1. Unit tests: `tests/ordering.test.mjs` (10/10 PASS)
| Test | Result |
|---|---|
| Plan price comes from the catalogue; fake `price`/`total` fields ignored | PASS |
| Unknown plan, quantity 0, negative, or over 20 rejected | PASS |
| Basket: Everyday Dabba + Protein Bowl priced together | PASS |
| Basket: one fee per trip; weekly plan makes shared trips free | PASS |
| Add-on prices from catalogue; fake price, unknown, sold-out and negative items dropped | PASS |
| Basket size capped (0 or 5+ lines rejected) | PASS |
| Allergy: unsafe bowl blocked | PASS |
| Open redirects (`//`, `/\`, `/\\`, absolute, `javascript:`, CRLF) blocked | PASS |
| Razorpay checkout and webhook signatures: forged, modified, reused for another order, missing → rejected | PASS |
| Repeating an add-on line can't beat stock (review finding 6) | PASS |

## 2. HTTP tests: `tests/http.security.mjs` (10/10 PASS)
| Test | Result |
|---|---|
| `/admin`, `/rider`, `/account`, `/orders`, `/company`, `/account/security` redirect signed-out users to sign-in | PASS |
| Guessed order / receipt IDs redirect, no data | PASS |
| Webhook: no signature, fake signature, tampered body → 400 | PASS |
| Webhook: unknown event ignored; validly signed event for an unknown order changes nothing | PASS |
| Webhook: 300 KB body → 413 | PASS |
| CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy set; no X-Powered-By | PASS |
| Sign-in callback cannot redirect to another site | PASS |
| Cross-site POST to sign-out → 403 | PASS |
| Private pages `no-store` / `private` and `noindex` | PASS |
| Staff/account pages block third-party scripts (review finding 8) | PASS |

## 3. Database authorization: `tests/rls.security.mjs` (8/9 PASS, 1 expected FAIL)
Two throwaway customer accounts were created, used with real browser-level tokens, then deleted (verified: 0 leftover users, 0 leftover orders).

| Test | Result |
|---|---|
| Signed-out visitors read nothing (profiles, orders, deliveries, companies, transactions, rider GPS) | PASS |
| A customer never sees other customers' profiles | PASS |
| Customer A cannot read customer B's order (IDOR) | PASS |
| A customer cannot set their own role to admin | PASS |
| A customer cannot mark an order paid, change its total, or insert orders | PASS |
| A customer cannot call `confirm_online_order`, `adjust_company_wallet`, `credit_company_topup`, `place_company_order` | PASS |
| A customer cannot publish a fake rider location | PASS |
| Rider GPS hidden from customers without a delivery on the way | PASS |
| An admin **without 2-step login** cannot read other customers' orders | **FAIL until `003_security.sql` is run** (the app already blocks this; the database check arrives with the migration) |

## 4. Scans
| Check | Result |
|---|---|
| `npm audit --omit=dev` | PASS: 0 vulnerabilities (after `npm audit fix`: Next.js 16.4.6, sharp, source-map-js) |
| Secrets in tracked files | PASS: none |
| Secrets in git history (Supabase secret, Razorpay test secret) | PASS: none |
| Server secrets in browser bundles (`.next/static`) | PASS: none of the three server secrets found |
| `npm run lint`, `npm run build` | PASS |

## 5. NOT TESTED (needs a person, a browser or the pending migrations)
- 2-step login end to end (enrol QR in an authenticator app, then verify): needs a phone. Code reviewed only.
- Razorpay Checkout opening and paying under the new CSP in a real browser: do one test-mode payment on the preview.
- Rate limits returning "Too many requests", and security-event logging: need `003_security.sql`.
- Basket checkout and stale-payment refund marking against a real Razorpay test payment.
- Rider proof photo upload from a phone camera, and the 150 m warning.
- Realtime subscriptions (covered by the same RLS policies tested above).
- Supabase dashboard settings (OTP expiry, secure email change, MFA enabled): can't be read from code.

## 6. Independent second review
A separate reviewer re-read every privileged path assuming the first pass missed things. It found **no critical or high issues** and 9 medium/low ones, all now fixed:

| # | Sev | Finding | Fix |
|---|---|---|---|
| R1 | Medium | Pause racing a skip could create an extra free box and inflate a refund | Pause/resume/slot updates only touch rows still in the expected status |
| R2 | Medium | Unpaid orders never expired; paying hours later bypassed cutoffs, slot capacity and stock | Payments for orders older than 45 min or past the meal cutoff (+15 min) are not cooked; marked cancelled with full `refund_due` and logged |
| R3 | Low-Med | Same box could be reported and refunded twice | Code check + unique index (open/refund/make-up) |
| R4 | Low | `cancel_order` overwrote earlier `refund_due` | Now adds to it |
| R5 | Low | Changing slot ignored capacity and the far-address rule | Checked for every affected date |
| R6 | Low | Repeating an add-on line bypassed stock | Lines merged before the stock check (tested) |
| R7 | Low | Employees could read the company join code and wallet via the API | Browsers can no longer read profiles, orders or company tables directly |
| R8 | Low | Google Tag Manager ran on admin/staff pages | Stricter second CSP on staff and account pages (tested) |
| R9 | Low | Rider could start a future delivery (exposing live GPS); GPS not cleared on admin status changes | Only today's drops can start; GPS cleared on admin changes too |
| R10 | Needs confirmation | Whoever controls an admin inbox can enrol 2-step login first | Admins should enrol immediately; turn on "Secure email change" in Supabase (checklist) |
