import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Check, Heart, Leaf, Package, Sparkles } from 'lucide-react'
import { CallToAction, Eyebrow, FounderSection, PageHero } from '../../site.jsx'
import { dishGallery, photos } from '../../images.js'
import { buildMetadata } from '../../metadata.js'

export const metadata = buildMetadata('/about')

const values = [
  {
    icon: Heart,
    title: 'Warm',
    text: 'Welcoming, comforting and always close to the feeling of a meal made with care.',
  },
  {
    icon: Sparkles,
    title: 'Playful',
    text: 'Bold colour, friendly language and plenty of character—without trying too hard.',
  },
  {
    icon: Package,
    title: 'Generous',
    text: 'A proper lunch should leave you happy, satisfied and ready for the rest of your day.',
  },
  {
    icon: Leaf,
    title: 'Honest',
    text: 'Recognisable dishes, simple words and everyday Indian food at the centre of it all.',
  },
]

export default function AboutPage() {
  return (
    <main>
      <PageHero
        eyebrow="Our story"
        title="Made with care. Served with love."
        image={photos.founderWide}
        alt="The founder of Garam Dibba at Tea Time, her café"
      >
        <p>
          Garam Dibba began with a mother wondering what her children would eat away from home, and grew
          into a kitchen that cooks the simple, familiar food so many of us miss.
        </p>
      </PageHero>

      <FounderSection full />

      <section className="values-section">
        <div className="shell">
          <div className="section-heading centered-heading">
            <Eyebrow>Our personality</Eyebrow>
            <h2>This is how we show up.</h2>
          </div>
          <div className="values-grid">
            {values.map(({ icon: Icon, title, text }, index) => (
              <article className="value-card" key={title}>
                <span className="value-index">0{index + 1}</span>
                <Icon aria-hidden="true" />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section shell gallery-section">
        <div className="section-heading centered-heading">
          <Eyebrow>From the Tea Time kitchen</Eyebrow>
          <h2>Where the cooking began.</h2>
        </div>
        <div className="gallery-grid">
          {dishGallery.map((photo) => (
            <figure className="gallery-item" key={photo.alt}>
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                placeholder="blur"
                sizes="(max-width: 980px) 50vw, 290px"
              />
            </figure>
          ))}
        </div>
      </section>

      <section className="section-flush shell promise-grid">
        <div className="promise-art">
          <Image
            src={photos.garamDabbaArt}
            alt="Hand-drawn homestyle Indian meal boxes"
            fill
            placeholder="blur"
            sizes="(max-width: 760px) 100vw, 620px"
          />
          <div className="promise-note">Made for real lunch breaks.</div>
        </div>
        <div className="promise-copy">
          <Eyebrow>The Garam Dibba promise</Eyebrow>
          <h2>Quality first. Always.</h2>
          <p>
            We want every part of Garam Dibba to carry the same feeling as the meal itself:
            warm, straightforward and unmistakably homely.
          </p>
          <ul className="check-list">
            <li><Check /> Eight protein bowls and a two-week North Indian lunch menu</li>
            <li><Check /> Seasonal vegetables chosen around freshness</li>
            <li><Check /> Friendly WhatsApp ordering, Monday to Saturday</li>
          </ul>
          <Link className="text-link" href="/menu">
            Explore the menu <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <CallToAction title="Hungry already? That makes two of us." />
    </main>
  )
}
