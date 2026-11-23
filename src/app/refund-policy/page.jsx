import Link from 'next/link'
import {
  CREDIT_VALIDITY_FACTOR,
  REPORT_WINDOW_MINUTES,
  SINGLE_MEAL_PRICE,
} from '../../lib/rules.js'
import { plans } from '../../siteData.js'
import { CreditTable, PolicyPage, PolicySection } from '../../policy.jsx'
import { policyMetadata, rupees, skipCutoffText } from '../../policyText.js'

const ROUTE = '/refund-policy'

export const metadata = policyMetadata({
  route: ROUTE,
  title: 'Refund and cancellation policy | Garam Dibba',
  description:
    'How skips, cancellations and refunds work at Garam Dibba: meal credits, the skip cutoff, plan refunds and refund timelines.',
})

// Worked example using the longest plan on the site.
function refundExample() {
  const plan = plans.reduce((longest, p) => (p.boxes > (longest?.boxes ?? 0) ? p : longest), null)
  if (!plan || plan.boxes < 3) return null
  const used = Math.round(plan.boxes / 3)
  const usedValue = used * SINGLE_MEAL_PRICE
  return { plan, used, usedValue, refund: Math.max(0, plan.total - usedValue) }
}

export default function RefundPolicyPage() {
  const cutoff = skipCutoffText()
  const example = refundExample()

  return (
    <PolicyPage
      route={ROUTE}
      eyebrow="Refunds and cancellations"
      title="Refund and cancellation policy"
      intro="Plans change. Here’s exactly what happens to your money and your meals when they do."
      summary={[
        `Skip a meal by ${cutoff} and you keep that meal.`,
        'If we miss your delivery, you keep the meal and we send a make-up box.',
        'Cancel a plan any time. We refund your unused meals, minus the plan discount on meals you’ve had.',
        'Refunds go back to the way you paid, usually within 5–7 working days.',
      ]}
    >
      <PolicySection title="Everything is paid in advance">
        <p>
          Every order is prepaid online through Razorpay. You can pay by UPI, card or netbanking. We don’t take
          cash on delivery.
        </p>
      </PolicySection>

      <PolicySection title="Your plan becomes meal credits">
        <p>
          When you buy a plan, each meal in it becomes one meal credit. A credit is used when we deliver a meal.
          Here’s what happens in every case:
        </p>
        <CreditTable />
        <p>
          Credits stay valid for {CREDIT_VALIDITY_FACTOR}× the plan length. For example, a 4-week plan is valid
          for {4 * CREDIT_VALIDITY_FACTOR} weeks. See our <Link className="policy-link" href="/terms">terms</Link>{' '}
          for the details.
        </p>
      </PolicySection>

      <PolicySection title="Skipping a meal">
        <p>
          You can skip any meal until <strong>{cutoff}</strong>. Your credit stays safe and your plan simply runs a
          day longer.
        </p>
        <p>
          After that, your meal is already planned in our kitchen. So a late skip uses the credit, and we still
          deliver your box.
        </p>
      </PolicySection>

      <PolicySection title="Cancelling a single meal">
        <p>
          Ordered just one meal? Cancel it by <strong>{cutoff}</strong> for a full refund. After the cutoff, the meal
          is locked in and will be delivered as usual.
        </p>
      </PolicySection>

      <PolicySection title="Cancelling a plan">
        <p>
          You can cancel a plan at any time. We refund your unused meal credits, minus the plan discount on the
          meals you’ve already had.
        </p>
        <p>
          Here’s how we work it out. Plans are cheaper per meal than ordering one at a time. When you cancel early,
          the meals you’ve had are re-priced at the single-meal price of {rupees(SINGLE_MEAL_PRICE)}. We refund
          the rest of what you paid.
        </p>
        {example && (
          <div className="policy-example">
            <p>
              <strong>Example:</strong> you paid {rupees(example.plan.total)} for a {example.plan.boxes}-meal{' '}
              {example.plan.name}. You’ve had {example.used} meals and want to cancel.
            </p>
            <ul>
              <li>
                Meals you’ve had: {example.used} × {rupees(SINGLE_MEAL_PRICE)} = {rupees(example.usedValue)}
              </li>
              <li>
                Your refund: {rupees(example.plan.total)} − {rupees(example.usedValue)} ={' '}
                <strong>{rupees(example.refund)}</strong>
              </li>
            </ul>
          </div>
        )}
        <p>
          To cancel, message us on WhatsApp, call or email us from the number or email you ordered with.
        </p>
      </PolicySection>

      <PolicySection title="If your box didn’t arrive or was wrong">
        <p>
          Tap <strong>“Didn’t get my box?”</strong> in{' '}
          <Link className="policy-link" href="/orders">My orders</Link>. You can report a problem until{' '}
          {REPORT_WINDOW_MINUTES} minutes after your delivery window ends.
        </p>
        <p>
          We check the rider’s delivery record. If we got it wrong, we restore your meal credit and schedule a
          make-up box. For a single-meal order, we refund you instead.
        </p>
      </PolicySection>

      <PolicySection title="When the money reaches you">
        <p>
          Refunds always go back to the original payment method: the same UPI app, card or bank account. Once we
          approve a refund, it usually takes 5–7 working days to show up. This is Razorpay’s standard timeline.
        </p>
        <p>If it’s taking longer, message us and we’ll help you follow it up.</p>
      </PolicySection>
    </PolicyPage>
  )
}
