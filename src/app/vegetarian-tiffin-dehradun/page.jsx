import {
  BowlShowcase,
  ButtonLink,
  CallToAction,
  DeliveryBand,
  Eyebrow,
  NorthIndianTeaser,
  PageHero,
  PlansSection,
} from '../../site.jsx'
import { bowlImages } from '../../images.js'
import { buildMetadata } from '../../metadata.js'

export const metadata = buildMetadata('/vegetarian-tiffin-dehradun')

export default function VegetarianPage() {
  return (
    <main>
      <PageHero
        eyebrow="Vegetarian tiffin • Dehradun"
        title="Vegetarian Tiffin Service in Dehradun"
        image={bowlImages['pesto-paneer']}
        alt="Garam Dibba Pesto Paneer bowl, a vegetarian tiffin meal in Dehradun"
        actions={(
          <>
            <ButtonLink to="/menu">Explore Vegetarian Menu</ButtonLink>
            <ButtonLink to="/meal-plans" className="button-cream">View Meal Plans</ButtonLink>
          </>
        )}
      >
        <p>
          Garam Dibba is a vegetarian tiffin service in Dehradun built for people who want convenient
          everyday meals with more variety.
        </p>
      </PageHero>

      <section className="section shell story-grid">
        <div className="story-title">
          <Eyebrow>Veg, every day</Eyebrow>
          <h2>A vegetarian menu with range.</h2>
        </div>
        <div className="story-copy">
          <p className="story-lede">
            Our current menu includes eight vegetarian protein bowls, combining familiar Indian
            favourites with modern flavour profiles, plus a two-week North Indian lunch menu.
          </p>
          <p>
            Whether you’re looking for a veg tiffin service near you, a convenient everyday meal or a
            longer meal plan, explore the Garam Dibba menu and choose the option that fits your routine.
          </p>
          <span className="veg-badge"><span>●</span> Vegetarian menu</span>
        </div>
      </section>

      <section className="section-flush bowls-section">
        <div className="shell">
          <div className="section-heading heading-row">
            <div>
              <Eyebrow>Protein bowls</Eyebrow>
              <h2>Eight vegetarian bowls.</h2>
            </div>
            <ButtonLink to="/menu#protein-bowls" className="button-outline">See all bowls</ButtonLink>
          </div>
          <BowlShowcase />
        </div>
      </section>

      <section className="section menu-teaser">
        <div className="shell">
          <div className="section-heading heading-row">
            <div>
              <Eyebrow>North Indian lunch</Eyebrow>
              <h2>Homestyle veg, six days a week.</h2>
            </div>
            <ButtonLink to="/menu#north-indian" className="button-outline">Full 2-week menu</ButtonLink>
          </div>
          <NorthIndianTeaser />
        </div>
      </section>

      <PlansSection />

      <DeliveryBand title="Veg tiffin, delivered in Dehradun.">
        <p>Check whether Garam Dibba currently delivers to your area of Dehradun before placing your order.</p>
      </DeliveryBand>

      <CallToAction />
    </main>
  )
}
