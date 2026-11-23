# Security fixes

All changes are on the `online-ordering` branch. None change the design or remove features.

## New files
| File | Purpose |
|---|---|
| `src/lib/safeRedirect.js` | `safeNextPath()`: same-site paths only (blocks `//host`, `/\host`, absolute URLs, control characters) |
| `src/lib/rateLimit.js` | Shared fixed-window rate limits (Postgres `rate_limit_hit`), per user or per platform IP; fails open with a warning |
| `src/lib/requestInfo.js` | Client IP from Vercel's `x-real-ip` / `x-forwarded-for` (set by the platform, not spoofable on Vercel) |
| `src/lib/securityLog.js` | `logEvent()` into `security_events`; never logs tokens, signatures, full addresses or GPS |
| `src/app/account/security/*` | TOTP 2-step login: enrol (QR + key) and verify; required for admins |
| `supabase/migrations/003_security.sql` | `rate_limits` + `rate_limit_hit()`, `security_events`, `is_admin()`/`is_rider()` require `aal2` for admins |
| `supabase/migrations/004_basket.sql` | `checkout_id`; allows several orders per Razorpay order (basket) |
| `tests/ordering.test.mjs` | Pricing, basket, add-on, allergy, redirect and signature tests |
| `tests/http.security.mjs` | Auth gates, webhook forgery/size, headers, redirects, logout CSRF, caching |
| `tests/rls.security.mjs` | Database authorization with real customer tokens (creates and deletes throwaway users) |

## Changed files
| File | Change |
|---|---|
| `src/lib/auth.js` | Session carries `aal`, `isAdmin` (role **and** aal2), `needsMfa`; `requireRole` sends unverified admins to 2-step login and logs denied access; ADMIN_EMAILS promotion only for confirmed emails, logged |
| `src/app/admin/actions.js` | Every action requires verified admin; rate-limited; safe `back` redirect; audit log for role, wallet, price, status, cancellation and report changes; atomic report resolution |
| `src/app/rider/actions.js` | Rider or verified admin only; rate-limited; GPS row deleted when the rider is idle |
| `src/app/orders/[id]/*`, receipt | Admin bypass of ownership requires verified admin; customer actions rate-limited |
| `src/lib/payments.js` | `verifiedPayment()`: fetches the payment from Razorpay and checks id, order, currency, exact amount, captured (captures an authorized payment for the exact amount); basket orders settled together; mismatches logged |
| `src/lib/razorpay.js` | `fetchPayment`, `capturePayment`, `toPaise`; signature check refuses when the key is missing |
| `src/lib/actions/payment.js` | Input type/length checks, rate limit, logs invalid signatures, no detail leaked to the browser |
| `src/app/api/razorpay/webhook/route.js` | Body size limit, event allowlist, payload shape check, logs bad signatures, mismatches not retried |
| `src/app/order/actions.js` | Rate limits on location, waitlist, slot load and order creation; basket validation (max 4 lines, field allowlists) |
| `src/app/account/actions.js`, `src/app/company/actions.js` | Rate limits (profile, pin, company code, top-up) |
| `src/app/auth/callback/route.js`, `src/app/login/*` | Safe `next` redirect |
| `src/app/auth/signout/route.js` | Same-origin POST only |
| `src/lib/orderData.js` | Upload magic-byte check (JPEG/PNG/WebP), 4 MB cap |
| `next.config.mjs` | CSP, HSTS (production), X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, COOP, `X-Robots-Tag: noindex` on private routes, no `X-Powered-By`, no browser source maps, 4 MB server-action body limit |
| `package-lock.json` | `npm audit fix` (Next.js 16.4.6, sharp, source-map-js, baseline-browser-mapping) |

## Compatibility notes
- **Admins must set up an authenticator app** the first time they open Kitchen admin (one minute). `ADMIN_MFA_REQUIRED=false` turns this off for local development only.
- The CSP was written for Razorpay, Supabase, OpenStreetMap, Google Fonts and Google Tag Manager. If something is blocked, set `CSP_REPORT_ONLY=true` on the preview only, check the browser console, add the origin in `next.config.mjs`, then remove the flag.
- Rate limits and the security log need `003_security.sql`; until it runs they fail open (the site keeps working).
