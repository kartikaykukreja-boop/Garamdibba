# Production checklist (manual steps)

Do these in order. ☐ = not done yet.

## Supabase
1. ☐ **Test project**: SQL Editor → run, in order, `supabase/migrations/002_ordering_spec.sql`, `003_security.sql`, `004_basket.sql`. Then run `node --test tests/rls.security.mjs`; all 9 should pass.
2. ☐ **Production**: create a **separate** Supabase project (Mumbai). Run `supabase/schema.sql` (contains everything). Never reuse the test project's keys.
3. ☐ **Rotate the test project's secret key** (it was pasted in chat): Project Settings → API Keys → create new secret key → update `.env.local` and Vercel Preview → delete the old key.
4. ☐ Authentication → Sign In / Providers → Email: keep enabled; **Email OTP expiration: 600 seconds** (10 min); OTP length 8 is fine.
5. ☐ Authentication → Rate Limits: emails 100/hour (with Resend), token verifications 30 per 5 min per IP, sign-ups/sign-ins 30 per 5 min per IP (defaults are fine).
6. ☐ Authentication → Multi-Factor: **App Authenticator (TOTP) enabled** (default on).
6a. ☐ Authentication → Providers → Email: **Secure email change ON** (both old and new address must confirm), so nobody can move their account onto an admin's email.
7. ☐ Authentication → URL Configuration: Site URL `https://garamdibba.com`; Redirect URLs only your real domains + `http://localhost:3000/auth/callback` (test project only). Remove any wildcard you don't need.
8. ☐ Storage: bucket `proofs` must stay **private** (no public policies).
9. ☐ Database → Backups: confirm daily backups are on; consider Point-in-Time Recovery when you go live.
10. ☐ Restrict who has access to the Supabase dashboard; turn on 2FA for every dashboard account.

## Vercel
1. ☐ Environment variables per environment: **Preview = test keys, Production = live keys**. Never put live Razorpay keys in Preview.
2. ☐ `ADMIN_EMAILS=kartikay.kukreja@garamdibba.com,udaikukreja@garamdibba.com` (both Preview and Production). After both admins have signed in **and set up 2-step login**, you may empty it; roles stay in the database.
3. ☐ Do **not** set `ADMIN_MFA_REQUIRED` or `CSP_REPORT_ONLY` in Production.
4. ☐ `GOOGLE_MAPS_API_KEY` (optional): in Google Cloud, restrict the key to **Distance Matrix API only** and set a daily quota/budget alert.
5. ☐ Settings → Deployment Protection: keep preview links protected when not testing (use Share links), or accept that the test site is public.
6. ☐ Team members: 2FA on, least privilege.

## Razorpay
1. ☐ Complete KYC; generate **live** keys; put them only in Vercel Production.
2. ☐ Webhooks (live mode): URL `https://garamdibba.com/api/razorpay/webhook`, events `payment.captured` and `order.paid`, a **new** strong secret (different from test) in `RAZORPAY_WEBHOOK_SECRET` (Production).
3. ☐ Payment capture: Automatic.
4. ☐ Dashboard: 2FA for every user; give staff "View only" or "Support" roles; only owners can refund.
5. ☐ Weekly: compare Razorpay settlements with Kitchen admin → Orders (refund_due column) — see INCIDENT_RESPONSE "Reconciliation".

## Email and domain
1. ☐ Google Workspace: **2-step verification on both admin mailboxes** (admin access starts from email).
2. ☐ Resend: API key with "Sending access" only, domain-restricted.
3. ☐ DNS (Squarespace): keep SPF/DKIM/DMARC; consider raising DMARC from `p=none` to `p=quarantine` after a few weeks of clean reports.
4. ☐ HTTPS: Vercel serves HTTPS automatically; HSTS is sent in production. Only consider `preload` once every subdomain is HTTPS.

## GitHub
1. ☐ 2FA on the GitHub account; protect `main` (require pull request, no force-push).
2. ☐ Enable Dependabot alerts and security updates.
3. ☐ Never commit `.env.local` (it is git-ignored; scans found no secrets in history).

## Before launch, run
```
npm run lint && npm test
BASE_URL=https://<preview-url> node --test tests/http.security.mjs
node --test tests/rls.security.mjs        # test project only
```
Then one real test-mode order on the preview: single meal, a basket (Dabba + Protein Bowl), a company order, and a rider delivery with photo.
