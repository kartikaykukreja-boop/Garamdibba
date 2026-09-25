import Link from 'next/link'
import {
  ArrowRight,
  Briefcase,
  ClipboardList,
  Clock3,
  Dumbbell,
  GraduationCap,
  Heart,
  House,
  Leaf,
  Truck,
} from 'lucide-react'
import {
  BowlShowcase,
  ButtonLink,
  CallToAction,
  DeliveryAreas,
  DeliveryBand,
  Eyebrow,
  FaqSection,
  PageHero,
  PlansSection,
} from '../../site.jsx'
import { bowls, dehradunFaqs, pageMeta, plans } from '../../siteData.js'
import { bowlImages } from '../../images.js'
import { JsonLd } from '../../seo.jsx'
import { buildMetadata } from '../../metadata.js'

const ROUTE = '/tiffin-service-dehradun'

export const metadata = buildMetadata(ROUTE)

const audiences = [
  { icon: GraduationCap, title: 'Students', text: 'A convenient option for busy college days when cooking isn’t practical.' },
  { icon: Briefcase, title: 'Working Professionals', text: 'A simple way to make everyday meals easier around a busy work schedule.' },
  { icon: Dumbbell, title: 'Fitness-Conscious Customers', text: 'For people who prefer vegetarian meals with a protein-focused approach.' },
  { icon: House, title: 'People Living Away From Home', text: 'For anyone who wants a reliable everyday meal option without having to cook every day.' },
]

export default function DehradunPage() {
  return (
    <main>
      <JsonLd data={pageMeta[ROUTE].schema} />
      <PageHero
        eyebrow="Garam Dibba • Dehradun"
        title="Tiffin Service in Dehradun"
        image={bowlImages['paneer-lababdar']}
        alt="Garam Dibba Paneer Lababdar bowl with rice, packed for tiffin delivery in Dehradun"
        actions={(
          <>
            <ButtonLink to="/menu">View Menu</ButtonLink>
            <ButtonLink to="/meal-plans" className="button-cream">View Meal Plans</ButtonLink>
          </>
        )}
      >
        <p className="hero-tagline">Looking for a convenient tiffin service in Dehradun?</p>
        <p>
          Garam Dibba is a modern vegetarian tiffin and meal-delivery service designed for everyday
          eating. We combine the convenience of a regular tiffin service with a menu that brings more
          variety, modern flavours and a protein-focused approach to your everyday meals.
        </p>
      </PageHero>

      <section className="section shell story-grid">
        <div className="story-title">
          <Eyebrow>Who we cook for</Eyebrow>
          <h2>Everyday meals, planned for you.</h2>
        </div>
        <div className="story-copy">
          <p className="story-lede">
            Whether you’re a student, working professional, fitness-conscious customer or someone
            living away from home, Garam Dibba gives you an easier way to plan your meals.
          </p>
        </div>
      </section>

      <section className="values-section">
        <div className="shell">
          <div className="section-heading centered-heading">
            <Eyebrow>Why Garam Dibba</Eyebrow>
            <h2>Why Choose Garam Dibba?</h2>
          </div>
          <div className="reason-grid">
            <article className="reason-card">
              <Leaf aria-hidden="true" />
              <h3>Vegetarian meals with more variety</h3>
              <p>Our current protein bowl menu includes eight vegetarian meals:</p>
              <ul className="chip-list">
                {bowls.map((bowl) => <li key={bowl.slug}>{bowl.name}</li>)}
              </ul>
              <p>
                From familiar Indian flavours to more contemporary options, the menu is designed to
                make everyday tiffin feel less repetitive, with a two-week North Indian lunch menu
                alongside.
              </p>
            </article>
            <article className="reason-card">
              <ClipboardList aria-hidden="true" />
              <h3>Flexible meal plans</h3>
              <p>Choose the plan that matches your routine:</p>
              <ul className="price-list">
                {plans.map((plan) => (
                  <li key={plan.id}><span>{plan.short}</span><strong>₹{plan.price}/box</strong></li>
                ))}
              </ul>
              <p>Delivery is available Monday to Saturday.</p>
            </article>
            <article className="reason-card">
              <Clock3 aria-hidden="true" />
              <h3>A convenient everyday option</h3>
              <p>
                A tiffin service is useful when you want your meals planned without having to cook
                every day or depend on a different takeaway option each time.
              </p>
              <p>Garam Dibba gives you a straightforward way to choose your meals, select a plan and order.</p>
            </article>
          </div>
        </div>
      </section>

      <DeliveryBand title="Looking for a Tiffin Service Near You in Dehradun?">
        <p>
          People searching for a tiffin service near me, home tiffin service, tiffin delivery near me
          or a nearby tiffin service are usually looking for the same thing: a convenient meal option
          available where they live or work.
        </p>
        <p>Garam Dibba serves customers in Dehradun based on current delivery availability. Check delivery availability before ordering.</p>
      </DeliveryBand>

      <section className="section shell">
        <div className="section-heading">
          <Eyebrow>Daily to monthly</Eyebrow>
          <h2>Daily and Longer-Term Tiffin Plans</h2>
        </div>
        <div className="plan-paths">
          <article>
            <span className="teaser-day">Need a meal for today?</span>
            <h3>Start with the 1-Day Plan.</h3>
          </article>
          <article>
            <span className="teaser-day">Want your meals sorted for the week?</span>
            <h3>Choose the 1-Week Plan.</h3>
          </article>
          <article>
            <span className="teaser-day">Planning further ahead?</span>
            <h3>Choose the 2-Week or 4-Week Plan.</h3>
          </article>
        </div>
        <p className="section-note">The longer your plan, the lower the current per-box price.</p>
      </section>

      <section className="section-tight shell info-grid">
        <article className="info-card">
          <Leaf aria-hidden="true" />
          <h2>Vegetarian Tiffin in Dehradun</h2>
          <p>
            Garam Dibba’s current menu is vegetarian, making it an option for customers specifically
            looking for a vegetarian tiffin service, veg tiffin service or pure veg tiffin service.
          </p>
          <p>The menu combines vegetarian meals with different flavour profiles instead of relying on one repetitive daily format.</p>
          <Link className="text-link" href="/vegetarian-tiffin-dehradun">Vegetarian tiffin <ArrowRight size={18} /></Link>
        </article>
        <article className="info-card">
          <Heart aria-hidden="true" />
          <h2>Healthy Tiffin in Dehradun</h2>
          <p>Garam Dibba takes a protein-focused approach to its vegetarian menu while keeping the service practical for everyday eating.</p>
          <p>
            We do not position our meals as medical diets or promise specific health outcomes. Instead,
            the focus is on making everyday meals easier to plan while offering vegetarian choices and a
            more varied menu.
          </p>
          <Link className="text-link" href="/healthy-tiffin-dehradun">Healthy tiffin <ArrowRight size={18} /></Link>
        </article>
        <article className="info-card info-card-wide">
          <Truck aria-hidden="true" />
          <h2>Tiffin Delivery in Dehradun</h2>
          <p>Garam Dibba provides tiffin and meal delivery according to the current service schedule.</p>
          <p><strong>Delivery days:</strong> Monday–Saturday</p>
          <DeliveryAreas />
          <Link className="text-link" href="/tiffin-delivery-dehradun">How delivery works <ArrowRight size={18} /></Link>
        </article>
      </section>

      <section className="values-section">
        <div className="shell">
          <div className="section-heading centered-heading">
            <Eyebrow>Made for real routines</Eyebrow>
            <h2>Who Is Garam Dibba For?</h2>
          </div>
          <div className="values-grid">
            {audiences.map(({ icon: Icon, title, text }, index) => (
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

      <section className="section bowls-section">
        <div className="shell">
          <div className="section-heading heading-row">
            <div>
              <Eyebrow>The menu</Eyebrow>
              <h2>Explore the Garam Dibba Menu</h2>
            </div>
            <ButtonLink to="/menu" className="button-outline">View Full Menu</ButtonLink>
          </div>
          <BowlShowcase />
        </div>
      </section>

      <PlansSection
        eyebrow="Choose your meal plan"
        title="Ready to make everyday meals easier?"
        intro="Explore the Garam Dibba plans and choose the option that fits your schedule."
      />

      <FaqSection faqs={dehradunFaqs} />

      <CallToAction />
    </main>
  )
}
