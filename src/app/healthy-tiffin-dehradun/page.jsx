import { Dumbbell, Leaf, Sparkles } from 'lucide-react'
import {
  BowlShowcase,
  ButtonLink,
  CallToAction,
  Eyebrow,
  PageHero,
  PlansSection,
} from '../../site.jsx'
import { bowlImages } from '../../images.js'
import { buildMetadata } from '../../metadata.js'

export const metadata = buildMetadata('/healthy-tiffin-dehradun')

export default function HealthyPage() {
  return (
    <main>
      <PageHero
        eyebrow="Healthy tiffin • Dehradun"
        title="Healthy Tiffin Service in Dehradun"
        image={bowlImages['tex-mex']}
        alt="Garam Dibba Tex-Mex bowl with spiced paneer, peppers, beans and corn"
        actions={(
          <>
            <ButtonLink to="/menu">View Menu</ButtonLink>
            <ButtonLink to="/meal-plans" className="button-cream">View Meal Plans</ButtonLink>
          </>
        )}
      >
        <p className="hero-tagline">Looking for a healthy tiffin service in Dehradun that fits into everyday life?</p>
        <p>
          Garam Dibba offers vegetarian, protein-focused meals designed around convenience, variety and
          modern flavours.
        </p>
      </PageHero>

      <section className="section shell story-grid">
        <div className="story-title">
          <Eyebrow>Our approach</Eyebrow>
          <h2>Healthy, without the boring part.</h2>
        </div>
        <div className="story-copy">
          <p className="story-lede">
            Instead of treating healthy food as something restrictive or repetitive, our menu gives you
            different vegetarian meal options that can fit naturally into your routine.
          </p>
          <p>
            Garam Dibba takes a protein-focused approach to its vegetarian menu while keeping the service
            practical for everyday eating. We do not position our meals as medical diets or promise
            specific health outcomes.
          </p>
          <p>Explore the current Garam Dibba menu and choose a plan that works for you.</p>
        </div>
      </section>

      <section className="features shell" aria-label="What healthy means at Garam Dibba">
        <article className="feature-card feature-red">
          <div className="feature-icon"><Dumbbell /></div>
          <span className="card-number">01</span>
          <h3>Protein-focused</h3>
          <p>Our bowls are built around paneer or chickpeas, with rice and vegetables.</p>
        </article>
        <article className="feature-card feature-mustard">
          <div className="feature-icon"><Leaf /></div>
          <span className="card-number">02</span>
          <h3>Vegetarian</h3>
          <p>The current Garam Dibba menu is vegetarian, from the bowls to the North Indian lunches.</p>
        </article>
        <article className="feature-card feature-cream">
          <div className="feature-icon"><Sparkles /></div>
          <span className="card-number">03</span>
          <h3>Varied</h3>
          <p>Eight protein bowls plus a rotating two-week menu, so every day doesn’t taste the same.</p>
        </article>
      </section>

      <section className="section-flush bowls-section">
        <div className="shell">
          <div className="section-heading heading-row">
            <div>
              <Eyebrow>On the menu</Eyebrow>
              <h2>Protein-focused bowls.</h2>
            </div>
            <ButtonLink to="/menu" className="button-outline">View Menu</ButtonLink>
          </div>
          <BowlShowcase />
        </div>
      </section>

      <PlansSection />

      <CallToAction />
    </main>
  )
}
