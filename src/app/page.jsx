import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarDays,
  IndianRupee,
  MapPin,
  MessageCircle,
  Soup,
  Sparkles,
  Utensils,
} from 'lucide-react'
import {
  BowlShowcase,
  ButtonLink,
  CallToAction,
  DeliveryBand,
  Eyebrow,
  FounderSection,
  PlansSection,
} from '../site.jsx'
import { photos } from '../images.js'
import { buildMetadata } from '../metadata.js'
import { CHECK_DELIVERY_MESSAGE, whatsappHref } from '../siteData.js'

export const metadata = buildMetadata('/')

export default function HomePage() {
  return (
    <main>
      <section className="home-hero shell">
        <div className="hero-copy">
          <Eyebrow light>Vegetarian tiffin • Dehradun</Eyebrow>
          <h1>Fresh vegetarian lunch, <em>sorted.</em></h1>
          <p className="hero-tagline">Protein bowls and homestyle North Indian meals, delivered in Dehradun.</p>
          <p className="hero-lede">
            Garam Dibba brings a fresh take to everyday tiffin in Dehradun. Choose from a menu of
            vegetarian meals with modern flavours, pick a meal plan that fits your routine, and get
            your food delivered Monday to Saturday.
          </p>
          <div className="hero-actions">
            <ButtonLink to="/menu">Browse menu</ButtonLink>
            <ButtonLink to="/meal-plans" className="button-cream">View plans</ButtonLink>
          </div>
          <div className="hero-meta" aria-label="Service highlights">
            <span><CalendarDays size={18} /> Monday–Saturday</span>
            <span><IndianRupee size={18} /> From ₹120/box</span>
            <span><Sparkles size={18} /> 8 protein bowls</span>
          </div>
        </div>

        <div className="hero-art" aria-label="Garam Dibba meal bowl">
          <Image
            src={photos.heroBowl}
            alt="Garam Dibba grilled paneer bowl with rice, sautéed mushrooms and roasted red pepper chutney"
            fill
            preload
            placeholder="blur"
            quality={85}
            sizes="(max-width: 980px) 100vw, 680px"
          />
          <div className="hero-sticker">
            <span>Aaj ka lunch?</span>
            <strong>Sorted.</strong>
          </div>
        </div>
      </section>

      <section className="mobile-home-actions shell" aria-labelledby="mobile-actions-title">
        <div className="mobile-section-heading">
          <p className="eyebrow">Start here</p>
          <h2 id="mobile-actions-title">What would you like?</h2>
        </div>
        <div className="mobile-action-grid">
          <Link href="/menu#protein-bowls">
            <Sparkles aria-hidden="true" />
            <span><strong>Protein bowls</strong><small>8 flavours</small></span>
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link href="/menu#north-indian">
            <Soup aria-hidden="true" />
            <span><strong>North Indian</strong><small>Homestyle lunch</small></span>
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link href="/meal-plans">
            <CalendarDays aria-hidden="true" />
            <span><strong>Meal plans</strong><small>From 1 day</small></span>
            <ArrowRight aria-hidden="true" />
          </Link>
          <a href={whatsappHref(CHECK_DELIVERY_MESSAGE)} target="_blank" rel="noreferrer">
            <MapPin aria-hidden="true" />
            <span><strong>Check delivery</strong><small>Ask on WhatsApp</small></span>
            <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </section>

      <div className="marquee" aria-label="Garam Dibba qualities">
        <div>
          <span>Vegetarian menu</span><b>✦</b><span>Protein-focused</span><b>✦</b>
          <span>Delivered Mon–Sat</span><b>✦</b><span>Ghar jaisa</span><b>✦</b>
          <span>Dibba kholke dekho</span><b>✦</b>
        </div>
      </div>

      <section className="section shell home-intro">
        <div>
          <Eyebrow>Made for Dehradun</Eyebrow>
          <h2>Tiffin Service in Dehradun</h2>
          <p className="story-lede intro-lede">
            Finding a reliable tiffin service in Dehradun shouldn’t mean settling for the same meal every day.
          </p>
        </div>
        <div className="intro-copy">
          <p>
            Garam Dibba is built for people in Dehradun who want everyday food to be convenient,
            vegetarian and more interesting. Whether you’re a student, working professional,
            fitness-conscious customer or simply looking for an easier way to manage your meals,
            Garam Dibba gives you a simple way to plan your food.
          </p>
          <p>
            Our current menu includes eight vegetarian protein bowls, from Hot & Sour Paneer and
            Paneer Pasanda to Paneer Lababdar, Pindi Chole, Tex-Mex, Pesto and Korean Paneer options,
            alongside a two-week North Indian lunch menu.
          </p>
          <p>Choose a single box or a longer meal plan depending on your routine.</p>
          <div className="inline-actions">
            <ButtonLink to="/tiffin-service-dehradun" className="button-outline">Explore Tiffin Service in Dehradun</ButtonLink>
            <Link className="text-link" href="/menu">View Today’s Menu <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>

      <section className="section bowls-section">
        <div className="shell">
          <div className="section-heading heading-row">
            <div>
              <Eyebrow>The protein bowls</Eyebrow>
              <h2>Eight bowls. Zero repetitive lunches.</h2>
            </div>
            <ButtonLink to="/menu" className="button-outline">See the full menu</ButtonLink>
          </div>
          <BowlShowcase />
          <Link className="north-strip" href="/menu#north-indian">
            <span className="north-strip-label">Plus</span>
            <span>
              <strong>A two-week North Indian lunch menu</strong>
              Dal tadka, rajma, kadhi, makhani dal with paneer and parathas, with rice, rotis, curd and salad.
            </span>
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="mobile-plan-preview" aria-labelledby="mobile-plans-title">
        <div className="shell">
          <div className="mobile-section-heading">
            <p className="eyebrow eyebrow-light">Pick your routine</p>
            <h2 id="mobile-plans-title">Plans at a glance</h2>
            <p>Choose the food first. Pick the duration when you are ready.</p>
          </div>
          <div className="mobile-plan-options">
            <Link href="/meal-plans#protein-bowl-plans">
              <Sparkles aria-hidden="true" />
              <span><strong>Protein bowl plans</strong><small>From ₹130 per bowl</small></span>
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link href="/meal-plans#plans">
              <Utensils aria-hidden="true" />
              <span><strong>North Indian plans</strong><small>From ₹120 per box</small></span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <Link className="mobile-view-all" href="/meal-plans">Compare all plans <ArrowRight aria-hidden="true" /></Link>
        </div>
      </section>

      <div className="desktop-home-plans">
        <PlansSection />
      </div>

      <div className="home-supporting-content">
        <FounderSection />

        <DeliveryBand title="Looking for a Tiffin Service Near You?">
          <p>
            Searching for a tiffin service near me, home tiffin service or tiffin delivery in Dehradun?
            Garam Dibba makes everyday meals easier with vegetarian food, flexible meal plans and a
            simple ordering process.
          </p>
          <p>Check whether Garam Dibba currently delivers to your area of Dehradun before placing your order.</p>
        </DeliveryBand>

        <CallToAction />
      </div>

      <section className="mobile-order-prompt">
        <div className="shell">
          <div>
            <p className="eyebrow eyebrow-light">Ready for lunch?</p>
            <h2>Order in a message.</h2>
            <p>Tell us your meal and location. We’ll take it from there.</p>
          </div>
          <a className="button button-cream" href={whatsappHref()} target="_blank" rel="noreferrer">
            <MessageCircle aria-hidden="true" />
            Chat on WhatsApp
            <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </section>
    </main>
  )
}
