# Garam Dibba

A warm, responsive website for Garam Dibba — a vegetarian tiffin service in
Dehradun with eight protein bowls, a two-week North Indian lunch menu, flexible
meal plans, online ordering with Razorpay, live delivery tracking and company
meal budgets.

Built with Next.js (App Router). Marketing pages are pre-rendered to static HTML, and
all photos go through `next/image` (resized, served as AVIF/WebP, blur placeholders).
Ordering uses Supabase (database, email login, realtime) and Razorpay (payments).

## Pages

- `/` Home: Dehradun intro, protein bowls, meal plans, the person behind Garam Dibba
- `/tiffin-service-dehradun`: main local SEO page with FAQs
- `/menu`: protein bowls and the Week 1 / Week 2 North Indian menu
- `/meal-plans`: prices and daily / weekly / monthly plans
- `/tiffin-delivery-dehradun`, `/vegetarian-tiffin-dehradun`, `/healthy-tiffin-dehradun`
- `/about`, `/contact`

### Online ordering (signed in)

- `/login`: email one-time code sign-in (also creates the account)
- `/order`: pick the location on a map (blocked outside the delivery radius), menu, plan, start date, then pay
- `/orders`, `/orders/[id]`: order history, delivery schedule and live rider tracking
- `/account`: profile, join a company with a code, or create a company (HR)
- `/company`: HR dashboard: budget, Razorpay top-ups, monthly limits, employees, ledger
- `/rider`: today's drops, live GPS sharing, navigate / call / mark delivered
- `/admin`: kitchen dashboard: prep list, rider assignment, statuses, orders, companies, user roles
- `/api/razorpay/webhook`: Razorpay payment webhook

## Backend setup (one time)

1. **Supabase**: create a free project at supabase.com (region: Mumbai).
   - SQL Editor → New query → paste all of `supabase/schema.sql` → Run.
   - Authentication → Sign In / Providers → Email: keep enabled.
   - Authentication → Emails → "Magic Link" template: add `Your code: {{ .Token }}`
     so the email contains the 6-digit code (the link keeps working too).
   - Authentication → URL Configuration: Site URL `https://garamdibba.com`, and add
     `https://garamdibba.com/auth/callback` and `http://localhost:3000/auth/callback` to Redirect URLs.
   - For real traffic, set up custom SMTP (Authentication → Emails → SMTP, e.g. Resend or
     Brevo). Supabase's built-in email sender only allows a few emails per hour.
2. **Environment variables**: copy `.env.example` to `.env.local` and fill it in. Add the
   same variables in the hosting dashboard (Vercel/Netlify) and redeploy.
3. **Razorpay**: Settings → Webhooks → Add: URL `https://garamdibba.com/api/razorpay/webhook`,
   events `payment.captured` and `order.paid`, and a secret (same as `RAZORPAY_WEBHOOK_SECRET`).
   Make sure payments are set to auto-capture (Settings → Payment Capture).
4. **Admin and riders**: put your email in `ADMIN_EMAILS` and sign in once. Riders sign in once,
   then an admin makes them a rider under Kitchen admin → Users & riders.

Test end to end with Razorpay test keys (`rzp_test_…`) before switching to live keys.

Notes:
- The delivery radius is a straight-line distance from `NEXT_PUBLIC_KITCHEN_LAT/LNG`.
- Rider GPS is shared from the browser, so the rider must keep `/rider` open on screen while
  delivering. Background tracking needs a native app.
- Refunds for cancelled online orders are made from the Razorpay dashboard; the admin page shows
  the amount due. Company orders are refunded to the company budget automatically.
- The North Indian Week 1 / Week 2 cycle is anchored in `src/lib/catalog.js` (`NORTH_INDIAN_WEEK1_MONDAY`).

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run start
```

## Content

Contact details, bowls, plans, FAQs, delivery areas and per-page titles and
descriptions live in `src/siteData.js`. Add verified delivery areas to
`DELIVERY_AREAS` to list them on the Dehradun and Delivery pages.

Bowl photos are in `public/bowls/` and are registered in `src/images.js`.

## Brand system

The site uses Garam Red, Deep Masala, Dibba Mustard, Cream and Warm Peach, with
Baloo 2, Poppins and Kalam typography.
