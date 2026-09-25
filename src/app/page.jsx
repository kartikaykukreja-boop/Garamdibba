import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CalendarDays, IndianRupee, Sparkles } from 'lucide-react'
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

export const metadata = buildMetadata('/')

export default function HomePage() {
  return (
    <main>
      <section className="home-hero shell">
        <div className="hero-copy">
          <Eyebrow light>Vegetarian tiffin • Dehradun</Eyebrow>
          <h1>A Modern Tiffin Service in <em>Dehradun</em></h1>
          <p className="hero-tagline">Vegetarian meals. Protein-focused choices. Delivered for everyday life.</p>
          <p className="hero-lede">
            Garam Dibba brings a fresh take to everyday tiffin in Dehradun. Choose from a menu of
            vegetarian meals with modern flavours, pick a meal plan that fits your routine, and get
            your food delivered Monday to Saturday.
          </p>
          <div className="hero-actions">
            <ButtonLink to="/menu">View Menu</ButtonLink>
            <ButtonLink to="/meal-plans" className="button-cream">Choose Your Meal Plan</ButtonLink>
          </div>
          <div className="hero-meta" aria-label="Service highlights">
            <span><CalendarDays size={18} /> Monday–Saturday</span>
            <span><IndianRupee size={18} /> From ₹110/box</span>
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
            Our current menu includes eight vegetarian protein bowls, from Tandoori Malai Paneer and
            Paneer Lababdar to Pindi Chole, Tex-Mex, Pesto, Peri-Peri and Korean Paneer options,
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

      <PlansSection />

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
    </main>
  )
}
