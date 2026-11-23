import Link from 'next/link'
import {
  BUSINESS,
  DELIVERY_FEE_BANDS,
  FREE_DELIVERY_KM,
  FREE_DELIVERY_MIN_MEALS,
  HANDOFFS,
  MAX_DELIVERY_KM,
  MEALS,
  MEAL_ORDER,
  REPORT_WINDOW_MINUTES,
  SUNDAY_CLOSED,
} from '../../lib/rules.js'
import { PolicyPage, PolicySection } from '../../policy.jsx'
import { formatTime, policyMetadata, rupees, skipCutoffText } from '../../policyText.js'

const ROUTE = '/delivery-policy'

export const metadata = policyMetadata({
  route: ROUTE,
  title: 'Delivery policy | Garam Dibba',
  description: `Where Garam Dibba delivers in Dehradun, delivery fees, lunch and dinner slots, order cutoffs and what happens if you can’t be reached.`,
})

function feeBands() {
  let from = 0
  return DELIVERY_FEE_BANDS.map((band) => {
    const label = from === 0 ? `Up to ${band.upToKm} km` : `${from}–${band.upToKm} km`
    from = band.upToKm
    return { label, fee: band.fee === 0 ? 'Free' : `${rupees(band.fee)} per delivery` }
  })
}

export default function DeliveryPolicyPage() {
  const meals = MEAL_ORDER.map((id) => MEALS[id])
  const days = SUNDAY_CLOSED ? 'Monday to Saturday' : 'Monday to Sunday'

  return (
    <PolicyPage
      route={ROUTE}
      eyebrow="Delivery"
      title="Delivery policy"
      intro="Hot, home-style meals at your door. Here’s where we go, when we come and what it costs."
      summary={[
        `We deliver within ${MAX_DELIVERY_KM} km by road from our kitchen, ${days}.`,
        `Delivery is free up to ${FREE_DELIVERY_KM} km.`,
        `Lunch arrives ${MEALS.lunch.window} and dinner ${MEALS.dinner.window}.`,
        'If we can’t reach you, the rider leaves your box the way you told us to.',
      ]}
    >
      <PolicySection title="Where we deliver">
        <p>
          We deliver within <strong>{MAX_DELIVERY_KM} km by road</strong> from our kitchen at {BUSINESS.kitchenAddress}.
        </p>
        <p>
          When you order, drop a pin on your address. We work out the road distance and tell you right away if we can
          deliver to you.
        </p>
      </PolicySection>

      <PolicySection title="Delivery fees">
        <div className="policy-table-wrap">
          <table className="policy-table">
            <thead>
              <tr>
                <th scope="col">Road distance from our kitchen</th>
                <th scope="col">Delivery fee</th>
              </tr>
            </thead>
            <tbody>
              {feeBands().map((band) => (
                <tr key={band.label}>
                  <td>{band.label}</td>
                  <td>{band.fee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {FREE_DELIVERY_MIN_MEALS != null && (
          <p>Plans with {FREE_DELIVERY_MIN_MEALS} or more meals get free delivery at any distance we cover.</p>
        )}
        <p>Any delivery fee is shown clearly before you pay. There are no other charges.</p>
      </PolicySection>

      <PolicySection title="Delivery days">
        <p>
          We deliver {days}.{SUNDAY_CLOSED && ' Our kitchen is closed on Sundays.'} If we close on a holiday, you’ll
          see it on the order page and those days won’t be booked.
        </p>
      </PolicySection>

      <PolicySection title="Meal times, slots and cutoffs">
        <p>Pick a 30-minute slot when you order. The rider aims to reach you within that slot.</p>
        <div className="policy-table-wrap">
          <table className="policy-table">
            <thead>
              <tr>
                <th scope="col">Meal</th>
                <th scope="col">Delivery slots</th>
                <th scope="col">Order same-day by</th>
              </tr>
            </thead>
            <tbody>
              {meals.map((meal) => (
                <tr key={meal.id}>
                  <td>
                    <strong>{meal.label}</strong>
                    <br />
                    {meal.window}
                  </td>
                  <td>{meal.slots.map((slot) => slot.label).join(', ')}</td>
                  <td>{formatTime(meal.cutoff)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul>
          {meals.map((meal) => (
            <li key={meal.id}>
              Same-day {meal.label.toLowerCase()} orders placed after {formatTime(meal.lateAfter)} can choose the later
              slots only.
            </li>
          ))}
          <li>
            Addresses more than {FREE_DELIVERY_KM} km away get the middle and later slots, so your food still arrives
            hot.
          </li>
          <li>
            Want to skip or change a meal? Do it by <strong>{skipCutoffText()}</strong>.
          </li>
        </ul>
      </PolicySection>

      <PolicySection title="If we can’t reach you">
        <p>When you order, you choose what the rider should do if you don’t answer. You can pick:</p>
        <ul>
          {HANDOFFS.map((handoff) => (
            <li key={handoff.id}>{handoff.label}</li>
          ))}
        </ul>
        <p className="policy-hinglish">Hum aapko call karenge, phir aapke bataaye hue tareeke se dibba chhod denge.</p>
        <p>
          If you chose a call, the rider calls you first. If you don’t pick up, they leave your box at your door or with
          the guard, as you asked. <strong>The meal then counts as delivered.</strong>
        </p>
        <p>
          Every time, the rider records the time, their GPS location and a photo of where they left your box. You can
          change your choice whenever you like.
        </p>
      </PolicySection>

      <PolicySection title="Didn’t get your box?">
        <p>
          Tap <strong>“Didn’t get my box?”</strong> in <Link className="policy-link" href="/orders">My orders</Link>.
          You can report it until {REPORT_WINDOW_MINUTES} minutes after your delivery window ends.
        </p>
        <p>
          We check the rider’s photo and location. If we got it wrong, we restore your meal credit and send a make-up
          box. For a single-meal order, we refund you. See our{' '}
          <Link className="policy-link" href="/refund-policy">refund policy</Link>.
        </p>
      </PolicySection>
    </PolicyPage>
  )
}
