import { BUSINESS } from '../../lib/rules.js'
import { CONTACT_EMAIL } from '../../siteData.js'
import { PolicyPage, PolicySection } from '../../policy.jsx'
import { policyMetadata } from '../../policyText.js'

const ROUTE = '/privacy'

export const metadata = policyMetadata({
  route: ROUTE,
  title: 'Privacy policy | Garam Dibba',
  description:
    'What personal details Garam Dibba collects, why we need them, who we share them with and how to ask us to delete them.',
})

export default function PrivacyPage() {
  return (
    <PolicyPage
      route={ROUTE}
      eyebrow="Your data"
      title="Privacy policy"
      intro="We only ask for what we need to cook your meal and get it to you. Here’s what that is, and how we look after it."
      summary={[
        'We use your phone, email, address and location to take your order and deliver it.',
        'Payments go through Razorpay. We never see or store your card or UPI details.',
        'We don’t sell your data.',
        `Email ${CONTACT_EMAIL} any time to ask us to delete your details.`,
      ]}
    >
      <PolicySection title="Who we are">
        <p>
          This policy covers the Garam Dibba website and ordering app, run by {BUSINESS.legalName}, {BUSINESS.kitchenAddress}.
        </p>
      </PolicySection>

      <PolicySection title="What we collect">
        <ul>
          <li>
            <strong>Phone number and email.</strong> To log you in with a one-time code and to contact you about your
            orders and deliveries.
          </li>
          <li>
            <strong>Name and delivery address.</strong> So the rider knows where to bring your box and who it’s for.
          </li>
          <li>
            <strong>Map pin (GPS location) of your address.</strong> To check you’re in our delivery zone, work out the
            delivery fee and guide the rider to your door. We use it only when you place or save it.
          </li>
          <li>
            <strong>Your orders and preferences.</strong> What you ordered, your slots, skips, allergies, food
            preferences, delivery instructions and any reports you make.
          </li>
          <li>
            <strong>Payment records.</strong> The amount, date and Razorpay reference of each payment and refund.
          </li>
        </ul>
      </PolicySection>

      <PolicySection title="Rider location and delivery photos">
        <ul>
          <li>
            <strong>Rider live location.</strong> While a rider turns on location sharing for their delivery run, their
            phone shares its live location with us. This lets you track your box and lets our kitchen see where
            deliveries are.
          </li>
          <li>
            <strong>Delivery proof.</strong> When a rider marks a box delivered, they record the time, their GPS
            location and a photo of where they left it. We use this only to confirm deliveries and sort out “Didn’t get
            my box?” reports.
          </li>
        </ul>
      </PolicySection>

      <PolicySection title="Payments">
        <p>
          All payments are handled by Razorpay. Your card number, UPI PIN and bank login go straight to Razorpay and
          your bank. <strong>We never see or store your card or UPI details.</strong> We only receive whether the
          payment worked, the amount and a reference number.
        </p>
      </PolicySection>

      <PolicySection title="Who we share it with">
        <p>We don’t sell your data. We share it only with the people and services that help us serve you:</p>
        <ul>
          <li>
            <strong>Our riders</strong> see your name, phone number, address, map pin and delivery instructions for the
            boxes they carry.
          </li>
          <li>
            <strong>Razorpay</strong> processes your payments and refunds.
          </li>
          <li>
            <strong>Supabase</strong> stores our data and runs our login system. It works as our data processor: it
            keeps the data for us and doesn’t use it for its own purposes.
          </li>
          <li>
            <strong>Map and analytics tools.</strong> The map on our site loads from OpenStreetMap, and we use Google
            Tag Manager to understand how people use our website.
          </li>
        </ul>
        <p>We may also share details if the law requires it.</p>
      </PolicySection>

      <PolicySection title="Cookies">
        <p>
          We use cookies to keep you logged in, and for basic website analytics. You can clear cookies in your browser at
          any time, but you’ll need to log in again.
        </p>
      </PolicySection>

      <PolicySection title="How long we keep it">
        <p>
          We keep your details while you order with us, so you don’t have to enter them again. We keep payment and
          order records for as long as the law asks us to.
        </p>
      </PolicySection>

      <PolicySection title="Deleting your data">
        <p>
          Want us to delete your details? Email{' '}
          <a className="policy-link" href={`mailto:${CONTACT_EMAIL}?subject=Delete%20my%20data`}>{CONTACT_EMAIL}</a>{' '}
          from the email linked to your account (or tell us the phone number you order with), and say what you’d like
          removed. We’ll confirm once
          it’s done. We may still keep payment records that the law requires.
        </p>
        <p>You can also email us to see or correct the details we hold about you.</p>
      </PolicySection>

      <PolicySection title="Changes to this policy">
        <p>If we change how we use your data, we’ll update this page. The date at the top shows the latest version.</p>
      </PolicySection>
    </PolicyPage>
  )
}
