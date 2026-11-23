import Link from 'next/link'
import {
  BUSINESS,
  CREDIT_VALIDITY_FACTOR,
  HANDOFFS,
  MAX_DELIVERY_KM,
  REPORT_WINDOW_MINUTES,
} from '../../lib/rules.js'
import { CreditTable, PolicyPage, PolicySection } from '../../policy.jsx'
import { ALLERGEN_NOTICE, policyMetadata, skipCutoffText } from '../../policyText.js'

const ROUTE = '/terms'

export const metadata = policyMetadata({
  route: ROUTE,
  title: 'Terms of service | Garam Dibba',
  description:
    'The simple rules for ordering from Garam Dibba: prepaid orders, meal credits and validity, skips, deliveries, missing-box reports and allergens.',
})

export default function TermsPage() {
  const cutoff = skipCutoffText()

  return (
    <PolicyPage
      route={ROUTE}
      eyebrow="The fine print, made simple"
      title="Terms of service"
      intro="These are the rules for ordering from Garam Dibba. By placing an order, you agree to them."
      summary={[
        'Every order is paid online before delivery. No cash on delivery.',
        `A plan becomes meal credits. Credits last ${CREDIT_VALIDITY_FACTOR}× your plan length.`,
        `Skip by ${cutoff} to keep the meal.`,
        'If you’re unreachable, we leave your box the way you chose, and it counts as delivered.',
        'Our kitchen handles dairy, gluten and nuts. Call us first if you have a severe allergy.',
      ]}
    >
      <PolicySection title="Who we are">
        <p>
          Garam Dibba{BUSINESS.legalName !== 'Garam Dibba' && ` (${BUSINESS.legalName})`} is a vegetarian tiffin
          service in Dehradun. Our kitchen is at{' '}
          {BUSINESS.kitchenAddress}.
          {BUSINESS.fssai && ` FSSAI licence no. ${BUSINESS.fssai}.`}
          {BUSINESS.gstin && ` GSTIN ${BUSINESS.gstin}.`}
        </p>
      </PolicySection>

      <PolicySection title="Ordering and payment">
        <ul>
          <li>Every order is prepaid online. We don’t take cash on delivery.</li>
          <li>Payments are handled by Razorpay. You can pay by UPI, card or netbanking.</li>
          <li>
            The price you see is the full price
            {BUSINESS.gstin ? ', inclusive of GST' : ''}. There are no hidden or convenience fees.
          </li>
          <li>
            If your address needs a delivery fee, it’s shown before you pay. See our{' '}
            <Link className="policy-link" href="/delivery-policy">delivery policy</Link>.
          </li>
          <li>We deliver within {MAX_DELIVERY_KM} km by road from our kitchen.</li>
        </ul>
      </PolicySection>

      <PolicySection title="Meal credits">
        <p>
          When you buy a plan, each meal in it becomes one meal credit. Each delivered meal uses one credit.
        </p>
        <CreditTable />
      </PolicySection>

      <PolicySection title="How long credits last">
        <p>
          Your credits stay valid for {CREDIT_VALIDITY_FACTOR}× the length of your plan.
          For example, a 4-week plan is valid for {4 * CREDIT_VALIDITY_FACTOR} weeks. This gives you room to skip
          days and still use every meal. Credits not used within this time expire.
        </p>
      </PolicySection>

      <PolicySection title="Skipping meals">
        <p>
          You can skip a meal until <strong>{cutoff}</strong>. You keep the credit and your plan’s end date moves
          forward. If you skip after that, the credit is used and we still deliver your meal.
        </p>
      </PolicySection>

      <PolicySection title="Delivery when we can’t reach you">
        <p>When you order, you tell us what to do if you don’t answer:</p>
        <ul>
          {HANDOFFS.map((handoff) => (
            <li key={handoff.id}>{handoff.label}</li>
          ))}
        </ul>
        <p>
          If you asked for a call, the rider calls you first. If you can’t be reached, they leave the box at your door
          or with the guard, as per your saved choice. <strong>The meal then counts as delivered</strong>. The rider records the time, their GPS location and a photo as proof.
        </p>
      </PolicySection>

      <PolicySection title="Reporting a missing or wrong box">
        <p>
          If your box didn’t arrive, or something was wrong, tap <strong>“Didn’t get my box?”</strong> in{' '}
          <Link className="policy-link" href="/orders">My orders</Link>. Reports are open until{' '}
          {REPORT_WINDOW_MINUTES} minutes after your delivery window ends.
        </p>
        <p>
          We check the rider’s delivery record. If the mistake was ours, we restore your credit and schedule a make-up
          box, or refund you for a single-meal order.
        </p>
      </PolicySection>

      <PolicySection title="Allergens">
        <p className="policy-callout">{ALLERGEN_NOTICE}</p>
        <p>
          You can add your allergies when you order. If a day’s menu has something on your list, we skip that day for
          you and you keep the credit. Even so, please read the menu and let us know about any allergy before you
          order.
        </p>
      </PolicySection>

      <PolicySection title="Cancellations and refunds">
        <p>
          You can cancel a plan or a single meal. How refunds work is explained in our{' '}
          <Link className="policy-link" href="/refund-policy">refund and cancellation policy</Link>.
        </p>
      </PolicySection>

      <PolicySection title="Your details">
        <p>
          Please keep your phone number and address correct, so our rider can find you. How we use your details is
          explained in our <Link className="policy-link" href="/privacy">privacy policy</Link>.
        </p>
      </PolicySection>

      <PolicySection title="Changes to these terms">
        <p>
          We may update these terms as our service grows. The date at the top of this page shows the latest version.
        </p>
      </PolicySection>
    </PolicyPage>
  )
}
