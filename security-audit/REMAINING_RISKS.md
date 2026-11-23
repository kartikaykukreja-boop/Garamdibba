# Remaining risks and assumptions

Nothing here is a known way to steal money or data today, but these are the gaps a professional tester should look at.

## Must do before taking real money
1. **Run the database migrations** `002`, `003`, `004` on the test project and `schema.sql` on a fresh production project. Until `003` runs, rate limits and the security log are off, and the database alone does not require 2-step login for admins (the app does).
2. **Rotate the Supabase secret key and Razorpay test secret** that were pasted into a chat.
3. **Admins set up 2-step login immediately** and turn on Google 2-step verification on both admin mailboxes. Admin access starts from email.
4. **One end-to-end test payment** on the preview under the new CSP, including a basket (Dabba + Protein Bowl) and a company order.

## Accepted risks (by design, for now)
| Risk | Why it's accepted | What would remove it |
|---|---|---|
| CSP allows `'unsafe-inline'` scripts | Next.js injects inline scripts; nonces would make every page dynamic | Nonce-based CSP via middleware once traffic justifies it |
| Supabase session cookies readable by JavaScript | How `@supabase/ssr` works | Keep CSP strict; avoid third-party scripts on private pages (done) |
| Login is email-only (no phone OTP) | The spec asks for phone OTP; that needs an Indian SMS provider with DLT registration | Add Supabase phone auth with an SMS provider |
| Rate limits fail open if the database is unreachable | Ordering should not break because the limiter is down | Add Vercel Firewall rate rules as a second layer |
| Rider GPS comes from the rider's phone and can be spoofed | Browsers can't prove location | Treat GPS + photo as evidence, not proof (the reports flow already does) |
| WhatsApp notifications only logged | No WhatsApp Business provider connected | Connect Meta Cloud API / AiSensy / Interakt in `src/lib/notify.js` |
| Refunds are manual in the Razorpay dashboard | Keeps refund power out of the website entirely | Fine as is; reconcile weekly |
| Slot capacity can be slightly exceeded by orders paid within the same minute | Capacity is checked at order time, not locked | Acceptable at current volume; add a DB constraint if slots get busy |
| Packaged stock can go slightly negative (clamped to 0) under simultaneous orders | Same reason | Reserve stock at order time if it matters |
| Dish allergen tags are provisional | Kitchen hasn't verified recipes (`ALLERGENS_VERIFIED = false`) | Verify, then set the flag to true |
| Customer location data retention | Addresses and pins are kept for repeat orders; proof photos kept indefinitely | Delete proof photos after ~90 days (scheduled job) and add account deletion on request (privacy page says email us) |
| Indian privacy law (DPDP Act 2023) | Not legally reviewed | Have a lawyer review the privacy policy and consent wording |

## Assumptions
- Hosted on Vercel, so `x-real-ip` comes from Vercel's edge and can't be forged. Behind another host, configure a trusted proxy.
- The Supabase service-role key exists only in Vercel server environment variables.
- Only the two admins listed in `ADMIN_EMAILS` should ever be admins.
- Single restaurant; there is no multi-tenant data.

## Recommended independent testing
Before launch or within the first month: a short external penetration test focused on payments (Razorpay test mode), account takeover, admin access and Supabase RLS. Re-run `tests/*.mjs` after every change to ordering, payments or the database.
