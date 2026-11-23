# Incident response

Keep this short list where both admins can find it. First, stay calm and write down times and what you saw.

## Where to look
- **Kitchen admin → Users & riders** (roles) and the `security_events` table in Supabase (Table Editor): role changes, wallet changes, price changes, refunds, payment/webhook failures, rate-limit hits, denied admin access.
- **Vercel → Logs** (server errors), **Razorpay → Payments / Settlements**, **Supabase → Auth → Users / Logs**.

## 1. Admin account compromised (or admin phone lost)
1. Supabase → Authentication → Users → find the admin → **Sign out user** (revokes sessions) and remove their MFA factor.
2. Supabase → Table Editor → `profiles` → set that person's `role` to `customer`. Remove them from `ADMIN_EMAILS` in Vercel and redeploy.
3. Change the mailbox password and turn on Google 2-step verification.
4. Review `security_events` for the period: role changes, wallet adjustments, price changes, cancellations. Undo anything not genuine.
5. Re-add the admin later: back into `ADMIN_EMAILS`, sign in, set up 2-step login again.

## 2. Payment fraud / suspicious payments
1. Kitchen admin → Orders: look for orders confirmed without a Razorpay payment ID, or totals that look wrong. `security_events` type `payment_mismatch` lists rejected payments.
2. Razorpay → Payments: check each suspicious payment's amount and status. The site only confirms captured payments for the exact stored amount.
3. Cancel unpaid or fraudulent orders in Kitchen admin ("Cancel remaining"); refunds are made only from the Razorpay dashboard by an owner.
4. If many failures come from one place, block it at Vercel (Firewall) and lower the limits in `src/lib/rateLimit.js`.

## 3. Leaked secret key (Supabase secret, Razorpay secret, webhook secret, Resend, Google)
1. **Rotate immediately** in the provider's dashboard (create new → update Vercel env → redeploy → delete old).
   - Supabase: Project Settings → API Keys.
   - Razorpay: Account & Settings → API Keys → Regenerate; Webhooks → edit → new secret.
   - Resend: API Keys → revoke and create.
   - Google: Credentials → regenerate key.
2. Check `security_events` and provider logs for use during the exposure window.
3. If the Supabase secret leaked, assume the database was readable: review recent changes to `profiles.role`, `companies.wallet_balance`, `orders.status`.

## 4. Customer data exposure
1. Stop the leak first (rotate keys, revert the change, or take the page down with a Vercel rollback).
2. Work out what data and which customers (names, phones, addresses, GPS).
3. Inform affected customers plainly. Indian law (DPDP Act 2023 and its rules) may require notifying the Data Protection Board and affected people; take legal advice on timelines.
4. Record what happened and what changed.

## 5. Site down or ordering broken
1. Vercel → Deployments → **Promote the last working deployment** (instant rollback).
2. Check Supabase status and Razorpay status pages.
3. Tell customers on WhatsApp to order by message until it's fixed.

## Reconciliation (weekly, 10 minutes)
- Razorpay captured payments for the week vs. Kitchen admin orders: every captured payment should map to confirmed orders with the same total (baskets share one payment).
- Orders with `refund_due` should have a matching refund in Razorpay.
- Flag: paid but no deliveries scheduled, or deliveries without a payment.
