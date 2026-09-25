import Image from 'next/image'
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { CallToAction, Eyebrow, OrderButton, PageHero } from '../../site.jsx'
import {
  CHECK_DELIVERY_MESSAGE,
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  PHONE_HREF,
} from '../../siteData.js'
import { bowlImages, photos } from '../../images.js'
import { buildMetadata } from '../../metadata.js'

export const metadata = buildMetadata('/contact')

export default function ContactPage() {
  return (
    <main>
      <PageHero
        eyebrow="Get in touch"
        title="Let’s sort your lunch."
        image={bowlImages['pindi-chole']}
        alt="Garam Dibba Pindi Chole bowl with rice and pickled onion"
      >
        <p>
          Message us on WhatsApp, give us a call or drop an email—whatever’s easiest. We deliver
          vegetarian tiffin in Dehradun, Monday to Saturday.
        </p>
      </PageHero>

      <section className="section shell promise-grid">
        <div className="promise-art">
          <Image
            src={photos.whatsappQr}
            alt="QR code to start a WhatsApp chat with Garam Dibba"
            fill
            placeholder="blur"
            sizes="(max-width: 760px) 100vw, 620px"
          />
          <div className="promise-note">Scan to WhatsApp</div>
        </div>
        <div className="promise-copy">
          <Eyebrow>Reach us directly</Eyebrow>
          <h2>Three easy ways to say hi.</h2>
          <ul className="check-list">
            <li>
              <MessageCircle />
              <span>
                <strong>WhatsApp</strong> — scan the QR code or tap the button below to chat with us directly.
              </span>
            </li>
            <li>
              <Phone />
              <span>
                <strong>Call or WhatsApp</strong> —{' '}
                <a className="text-link" href={PHONE_HREF}>{CONTACT_PHONE_DISPLAY}</a>
              </span>
            </li>
            <li>
              <Mail />
              <span>
                <strong>Email</strong> —{' '}
                <a className="text-link" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </span>
            </li>
            <li>
              <MapPin />
              <span>
                <strong>Delivery</strong> — Dehradun, Monday to Saturday. Ask us whether your area is covered.
              </span>
            </li>
          </ul>
          <div className="hero-actions">
            <OrderButton className="button-cream">Chat on WhatsApp</OrderButton>
            <OrderButton className="button-outline" message={CHECK_DELIVERY_MESSAGE}>Check Delivery</OrderButton>
          </div>
        </div>
      </section>

      <CallToAction title="Aaj ka lunch, sort kar lete hain?" />
    </main>
  )
}
