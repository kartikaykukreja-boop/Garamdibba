import { CalendarDays, ClipboardList, MapPin, MessageCircle, Truck, Utensils } from 'lucide-react'
import {
  CallToAction,
  DeliveryAreas,
  DeliveryBand,
  Eyebrow,
  OrderButton,
  OrderOnlineButton,
  PageHero,
  PlansSection,
} from '../../site.jsx'
import { CHECK_DELIVERY_MESSAGE } from '../../siteData.js'
import { bowlImages } from '../../images.js'
import { buildMetadata } from '../../metadata.js'

export const metadata = buildMetadata('/tiffin-delivery-dehradun')

const steps = [
  { icon: Utensils, title: 'Explore the Menu', text: 'Choose from the current Garam Dibba vegetarian meals.' },
  { icon: ClipboardList, title: 'Select Your Plan', text: 'Choose from the separate protein bowl or North Indian lunch plans.' },
  { icon: MessageCircle, title: 'Place Your Order', text: 'Send your order on WhatsApp or give us a call.' },
  { icon: Truck, title: 'Receive Your Meal', text: 'Your meal is delivered according to the current delivery schedule.' },
]

export default function DeliveryPage() {
  return (
    <main>
      <PageHero
        eyebrow="Tiffin delivery • Dehradun"
        title="Tiffin Delivery in Dehradun"
        image={bowlImages['korean-paneer']}
        alt="Garam Dibba Korean Paneer bowl packed for tiffin delivery in Dehradun"
        actions={(
          <>
            <OrderButton message={CHECK_DELIVERY_MESSAGE}>Check Delivery Availability</OrderButton>
            <OrderOnlineButton className="button-cream">Order Now</OrderOnlineButton>
          </>
        )}
      >
        <p>Make everyday meals easier with Garam Dibba’s vegetarian tiffin delivery service in Dehradun.</p>
        <p>Choose your meal, select a plan and place your order on WhatsApp.</p>
      </PageHero>

      <section className="how-section">
        <div className="shell">
          <div className="section-heading centered-heading">
            <Eyebrow>Step by step</Eyebrow>
            <h2>How Garam Dibba Delivery Works</h2>
          </div>
          <div className="steps-grid">
            {steps.map(({ icon: Icon, title, text }, index) => (
              <article key={title}>
                <span>{index + 1}</span>
                <Icon />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section shell info-grid">
        <article className="info-card">
          <CalendarDays aria-hidden="true" />
          <h2>Delivery Schedule</h2>
          <p className="info-big">Monday–Saturday</p>
          <p>Fresh meals on every delivery day, whether you choose a protein bowl or North Indian lunch plan.</p>
        </article>
        <article className="info-card">
          <MapPin aria-hidden="true" />
          <h2>Where Does Garam Dibba Deliver?</h2>
          <p>Garam Dibba currently operates in Dehradun.</p>
          <DeliveryAreas />
        </article>
      </section>

      <DeliveryBand eyebrow="Delivery near you" title="Looking for Tiffin Delivery Near You?" showOrder>
        <p>
          Garam Dibba is an option for customers searching for vegetarian tiffin delivery, home tiffin
          delivery and convenient everyday meals in Dehradun.
        </p>
      </DeliveryBand>

      <PlansSection />

      <CallToAction />
    </main>
  )
}
