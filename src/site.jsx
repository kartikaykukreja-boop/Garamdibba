import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  MapPin,
  MessageCircle,
  Phone,
  ShoppingBag,
  Utensils,
} from 'lucide-react'
import {
  CHECK_DELIVERY_MESSAGE,
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  DELIVERY_AREAS,
  PHONE_HREF,
  bowls,
  northIndianMenu,
  plans,
  proteinBowlPlans,
  proteinBowlRotation,
  whatsappHref,
} from './siteData.js'
import { bowlImages, photos } from './images.js'
import { BUSINESS } from './lib/rules.js'

const founderStory = [
  'Garam Dibba started with something very close to my heart, my children. When both of them left for college, I often found myself wondering what they would eat and whether they would get the kind of food they were used to having at home. That thought stayed with me, and it made me realise how much we all miss a simple, familiar meal when we are away from home.',
  'I had also always wanted to do something of my own in life. When the opportunity came, I felt that perhaps this was the path meant for me, and I decided to take that step. That journey eventually led me to start and run Tea Time, where I got the chance to cook for and serve so many different people.',
  'Over time, I understood that a lot of people who come to us feel the same way. Many are living away from their families, and when they eat out, they don’t always want something fancy. Sometimes, they simply want food that feels homely, comforting and familiar, the kind of food they grew up eating.',
  'For me, good food has always been simple. Dal, rice, sabzi and the feeling of a proper home-cooked meal. And while making food for people, there is one thing I never want to compromise on, quality.',
  'Garam Dibba comes from that same feeling. I want every dibba to carry the warmth and comfort of a meal made at home, simple food, made with care and served with love. ❤️',
]

export function BrandMark() {
  return (
    <span className="brand-mark" aria-label="Garam Dibba">
      <span>Garam</span>
      <Utensils aria-hidden="true" />
      <span>Dibba</span>
    </span>
  )
}

export function Eyebrow({ children, light = false }) {
  return <p className={light ? 'eyebrow eyebrow-light' : 'eyebrow'}>{children}</p>
}

export function OrderButton({ className = '', message, children = 'Order on WhatsApp' }) {
  return (
    <a
      className={`button ${className}`.trim()}
      href={whatsappHref(message)}
      target="_blank"
      rel="noreferrer"
    >
      <MessageCircle size={20} />
      {children}
      <ArrowRight size={18} />
    </a>
  )
}

// Protein Bowls sub-brand icon: a bowl with paneer and three steam lines (line art, one colour).
export function BowlIcon(props) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M18 3.5c-1.8 2.2 1.8 4.1 0 6.6M24.2 3c-1.8 2.2 1.8 4.1 0 6.6M30.4 3.5c-1.8 2.2 1.8 4.1 0 6.6" />
      <path d="M15.6 22.6l1.1-5.4 5.3 1.2-1 5.1M24.4 22.8l2.2-4.6 4.8 2.1-1.2 2.7" />
      <path d="M5.8 23.4c12.3-.6 24.2-.5 36.4.2-.4 8.9-7.7 14.6-18.1 14.6S6.3 32.4 5.8 23.4z" />
      <path d="M17.6 42.4c4.3-.5 8.5-.5 12.9.1" />
    </svg>
  )
}

// "Protein Bowls" sub-brand heading: icon, then Protein (handwritten) over Bowls.
export function ProteinBowlsHeading({ as: Tag = 'h2', title = 'Bowls' }) {
  return (
    <Tag className="subbrand-heading">
      <BowlIcon />
      <span>
        <small>Protein</small>
        <strong>{title}</strong>
      </span>
    </Tag>
  )
}

// Opens online ordering. plan / bowl preselect that choice on the order page.
export function OrderOnlineButton({ className = '', plan, bowl, children = 'Order online' }) {
  const query = new URLSearchParams(Object.entries({ plan, bowl }).filter(([, v]) => v)).toString()
  return (
    <Link className={`button ${className}`.trim()} href={query ? `/order?${query}` : '/order'}>
      <ShoppingBag size={20} />
      {children}
      <ArrowRight size={18} />
    </Link>
  )
}

export function ButtonLink({ to, className = '', children }) {
  return (
    <Link className={`button ${className}`.trim()} href={to}>
      {children}
      <ArrowRight size={18} />
    </Link>
  )
}

export function PageHero({ eyebrow, title, children, image, alt, art, actions }) {
  return (
    <section className="page-hero">
      <div className="shell page-hero-grid">
        <div className="page-hero-copy">
          <Eyebrow light>{eyebrow}</Eyebrow>
          <h1>{title}</h1>
          {children}
          {actions && <div className="hero-actions page-hero-actions">{actions}</div>}
        </div>
        {art ?? (
          <div className="about-hero-art">
            <Image
              src={image}
              alt={alt}
              fill
              preload
              placeholder="blur"
              quality={85}
              sizes="(max-width: 980px) 100vw, 650px"
            />
          </div>
        )}
      </div>
    </section>
  )
}

// Showcase tile sizes follow the 4-column grid: tile 1 is 2×2, tile 6 is 2 wide.
const tileSizes = (index) => {
  if (index === 0) return '(max-width: 760px) 100vw, 590px'
  if (index === 5) return '(max-width: 760px) 100vw, 590px'
  return '(max-width: 760px) 50vw, 290px'
}

export function BowlShowcase() {
  return (
    <div className="bowl-showcase">
      {bowls.map((bowl, index) => (
        <Link className="bowl-tile" href="/menu#protein-bowls" key={bowl.slug}>
          <Image
            src={bowlImages[bowl.slug]}
            alt={bowl.alt}
            fill
            placeholder="blur"
            sizes={tileSizes(index)}
          />
          <span className="bowl-tile-caption">
            <small>{bowl.style}</small>
            <strong>{bowl.name}</strong>
          </span>
        </Link>
      ))}
    </div>
  )
}

export function BowlCards() {
  return (
    <div className="bowl-card-grid">
      {bowls.map((bowl, index) => (
        <article className="bowl-card" key={bowl.slug}>
          <figure>
            <Image
              src={bowlImages[bowl.slug]}
              alt={bowl.alt}
              fill
              placeholder="blur"
              sizes="(max-width: 760px) 40vw, (max-width: 980px) 50vw, 290px"
            />
            <span className="bowl-style">{bowl.style}</span>
            {bowl.protein && (
              <span className="protein-badge">
                <strong>{bowl.protein}g</strong>
                <small>Protein</small>
              </span>
            )}
          </figure>
          <div className="bowl-card-body">
            <span className="menu-index">0{index + 1}</span>
            <h3>{bowl.name}</h3>
            <p>{bowl.blurb}</p>
            <OrderOnlineButton className="menu-order-link" bowl={bowl.slug}>
              Order this bowl
            </OrderOnlineButton>
          </div>
        </article>
      ))}
    </div>
  )
}

export function HeroMosaic({ className = '' }) {
  return (
    <div className={`hero-mosaic ${className}`.trim()} aria-hidden="true">
      {bowls.slice(3, 7).map((bowl, index) => (
        <Image
          src={bowlImages[bowl.slug]}
          alt=""
          key={bowl.slug}
          placeholder="blur"
          preload={index === 0}
          sizes="(max-width: 980px) 50vw, 320px"
        />
      ))}
    </div>
  )
}

// unit: 'box' for North Indian lunch, 'bowl' for protein bowls.
export function PlanGrid({ items = plans, unit = 'box' }) {
  const units = unit === 'box' ? 'boxes' : `${unit}s`
  return (
    <div className={items.length === 4 ? 'plan-grid plan-grid-four' : 'plan-grid'}>
      {items.map((plan) => (
        <article className={plan.best ? 'plan-card is-best' : 'plan-card'} key={plan.id}>
          {plan.best && <span className="plan-badge">Best value</span>}
          <h3>{plan.name}</h3>
          <p className="plan-price">
            <span>₹{plan.price}</span>
            <small>/{unit}</small>
          </p>
          {plan.boxes && (
            <p className="plan-total">
              <span>{plan.boxes} {plan.boxes === 1 ? unit : units}</span>
              <strong>₹{plan.total.toLocaleString('en-IN')} total</strong>
            </p>
          )}
          <p className="plan-note">{plan.note}</p>
          <OrderOnlineButton className="menu-order-link" plan={plan.id}>
            Choose plan
          </OrderOnlineButton>
        </article>
      ))}
    </div>
  )
}

export function ProteinBowlProgram({ showPlans = true }) {
  return (
    <div className="protein-program">
      <div className="protein-program-heading">
        <div>
          <Eyebrow>Your week, sorted</Eyebrow>
          <h3>6-Bowl Weekly Rotation</h3>
          <p>One bowl each day from Monday to Saturday. Sunday is off.</p>
        </div>
        <span className="rotation-badge">26–30g protein</span>
      </div>

      <ol className="rotation-grid">
        {proteinBowlRotation.map(({ day, bowl }, index) => (
          <li key={day}>
            <span className="rotation-day">{day}</span>
            <span className="rotation-number">0{index + 1}</span>
            <strong>{bowl}</strong>
          </li>
        ))}
      </ol>

      <div className="custom-weekly-menu">
        <div>
          <span className="menu-number">Make it yours</span>
          <h3>Build Your Own Weekly Menu</h3>
          <p>Choose any six bowls from our full eight-bowl menu for your Monday–Saturday plan.</p>
        </div>
        <div className="custom-menu-actions">
          <ul className="custom-bowl-list" aria-label="Eight bowls available for a custom weekly menu">
            {bowls.map((bowl) => <li key={bowl.slug}>{bowl.name}</li>)}
          </ul>
          <OrderButton message="Hi Garam Dibba! I would like to build my own 6-bowl weekly protein bowl menu. 🍱">
            Build my weekly menu
          </OrderButton>
        </div>
      </div>

      {showPlans && (
        <div className="protein-plan-block plans-light">
          <div className="section-heading centered-heading">
            <Eyebrow>Protein bowl plans</Eyebrow>
            <h3>Choose Your Protein Bowl Plan</h3>
            <p className="section-sub">These prices apply to protein bowls and are separate from the North Indian lunch plans.</p>
          </div>
          <PlanGrid items={proteinBowlPlans} unit="bowl" />
          <div className="plans-foot">
            <p>
              <CalendarDays size={18} aria-hidden="true" />
              <span><strong>Delivery: Monday–Saturday.</strong> The 1-week plan includes six bowls, with Sunday off.</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export function PlansSection({
  eyebrow = 'North Indian lunch plans',
  title = 'Homestyle Lunch Plans That Fit Your Routine',
  intro = 'These plans apply to the North Indian lunch menu. Protein bowl plans are priced separately.',
  showLink = true,
}) {
  return (
    <section className="plans-section">
      <div className="shell">
        <div className="section-heading centered-heading">
          <Eyebrow light>{eyebrow}</Eyebrow>
          <h2>{title}</h2>
          {intro && <p className="section-sub">{intro}</p>}
        </div>
        <PlanGrid />
        <div className="plans-foot">
          <p>
            <CalendarDays size={18} aria-hidden="true" />
            <span><strong>Delivery: Monday–Saturday.</strong> Choose your plan, explore the menu and make everyday meals one less thing to think about.</span>
          </p>
          {showLink && <ButtonLink to="/meal-plans" className="button-cream">View Meal Plans</ButtonLink>}
        </div>
      </div>
    </section>
  )
}

export function DeliveryBand({ eyebrow = 'Tiffin near you', title, children, showOrder = false }) {
  return (
    <section className="delivery-band">
      <div className="shell delivery-band-inner">
        <div className="delivery-band-icon" aria-hidden="true"><MapPin /></div>
        <div className="delivery-band-copy">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2>{title}</h2>
          {children}
        </div>
        <div className="delivery-band-actions">
          <OrderButton message={CHECK_DELIVERY_MESSAGE}>Check Delivery Availability</OrderButton>
          {showOrder ? (
            <OrderOnlineButton className="button-outline">Order Now</OrderOnlineButton>
          ) : (
            <a className="text-link" href={PHONE_HREF}>
              <Phone size={16} /> Or call {CONTACT_PHONE_DISPLAY}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

export function FounderSection({ full = false }) {
  const paragraphs = full ? founderStory : [founderStory[0], founderStory[3], founderStory[4]]

  return (
    <section className="section founder-section">
      <div className="shell founder-grid">
        <div className="founder-photo">
          <Image
            src={photos.founder}
            alt="The founder of Garam Dibba smiling with a cup of tea against a brick wall"
            placeholder="blur"
            quality={85}
            sizes="(max-width: 760px) 100vw, 480px"
          />
          <div className="promise-note">Founder, Garam Dibba &amp; Tea Time</div>
        </div>
        <div className="founder-copy">
          <Eyebrow>Meet the person behind Garam Dibba</Eyebrow>
          <h2>The Person Behind Garam Dibba</h2>
          {paragraphs.map((text, index) => (
            <p className={index === 0 ? 'story-lede' : undefined} key={text.slice(0, 24)}>{text}</p>
          ))}
          <p className="founder-sign">Simple food, made with care and served with love.</p>
          {!full && (
            <Link className="text-link" href="/about">
              Read her full story <ArrowRight size={18} />
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

export function FaqList({ faqs }) {
  return (
    <div className="faq-list">
      {faqs.map(({ q, a }) => (
        <details className="faq-item" key={q}>
          <summary>
            <span>{q}</span>
            <ChevronDown aria-hidden="true" />
          </summary>
          <p>{a}</p>
        </details>
      ))}
    </div>
  )
}

export function FaqSection({ faqs, title = 'Frequently Asked Questions' }) {
  return (
    <section className="section shell faq-section">
      <div className="story-title">
        <Eyebrow>Good to know</Eyebrow>
        <h2>{title}</h2>
      </div>
      <FaqList faqs={faqs} />
    </section>
  )
}

export function HowSteps({ title = 'From menu to dibba in three taps.', eyebrow = 'Ordering, sorted' }) {
  return (
    <section className="how-section">
      <div className="shell">
        <div className="section-heading centered-heading">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2>{title}</h2>
        </div>
        <div className="how-grid">
          <article>
            <span>1</span>
            <Utensils />
            <h3>Pick your meal</h3>
            <p>Choose a protein bowl or a day from the North Indian lunch menu.</p>
          </article>
          <ChevronRight className="how-arrow" />
          <article>
            <span>2</span>
            <CalendarDays />
            <h3>Choose your plan</h3>
            <p>Choose a separate protein bowl or North Indian lunch plan, Monday to Saturday.</p>
          </article>
          <ChevronRight className="how-arrow" />
          <article>
            <span>3</span>
            <ShoppingBag />
            <h3>Order online</h3>
            <p>Pin your address, pay securely and track your dibba on its way. Prefer chat? WhatsApp works too.</p>
          </article>
        </div>
      </div>
    </section>
  )
}

export function DeliveryAreas() {
  if (DELIVERY_AREAS.length === 0) {
    return (
      <p>
        Delivery availability can vary by location, so message us your area on WhatsApp or call{' '}
        <a className="inline-link" href={PHONE_HREF}>{CONTACT_PHONE_DISPLAY}</a> and we’ll confirm
        whether it’s currently covered before you order.
      </p>
    )
  }

  return (
    <>
      <ul className="chip-list">
        {DELIVERY_AREAS.map((area) => <li key={area}>{area}</li>)}
      </ul>
      <p>Delivery availability can vary by location, so check whether your area is covered before ordering.</p>
    </>
  )
}

export function NorthIndianTeaser() {
  return (
    <div className="teaser-grid">
      {northIndianMenu['Week 1'].slice(0, 3).map((item, index) => (
        <article className="teaser-card" key={item.day}>
          <span className="teaser-day">0{index + 1} / {item.day}</span>
          <h3>{item.main}</h3>
          <p>{item.veg}</p>
          <div className="teaser-sides">{item.sides}</div>
        </article>
      ))}
    </div>
  )
}

export function CallToAction({ title = 'Ready for a proper lunch?' }) {
  return (
    <section className="cta-section">
      <div className="shell cta-inner">
        <div>
          <Eyebrow light>Garam hai. Ghar jaisa hai.</Eyebrow>
          <h2>{title}</h2>
          <p>
            Order online in a minute, message us on{' '}
            <a href={whatsappHref()} target="_blank" rel="noreferrer">WhatsApp</a>, or call us on{' '}
            <a href={PHONE_HREF}>{CONTACT_PHONE_DISPLAY}</a>.
          </p>
        </div>
        <OrderOnlineButton className="button-cream" />
      </div>
    </section>
  )
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-brand">
          <BrandMark />
          <p>Ghar ka khana. Tiffin mein.</p>
          <span>Vegetarian tiffin service in Dehradun.</span>
          <address className="footer-legal">
            <span>Kitchen: {BUSINESS.kitchenAddress}</span>
            {BUSINESS.fssai && <span>FSSAI Lic. No. {BUSINESS.fssai}</span>}
            {BUSINESS.gstin && <span>GSTIN {BUSINESS.gstin}</span>}
          </address>
        </div>
        <div className="footer-links">
          <p>Explore</p>
          <Link href="/menu">Menu</Link>
          <Link href="/meal-plans">Meal plans</Link>
          <Link href="/about">Our story</Link>
          <Link href="/contact">Contact</Link>
        </div>
        <div className="footer-links">
          <p>Tiffin in Dehradun</p>
          <Link href="/tiffin-service-dehradun">Tiffin service Dehradun</Link>
          <Link href="/tiffin-delivery-dehradun">Tiffin delivery</Link>
          <Link href="/vegetarian-tiffin-dehradun">Vegetarian tiffin</Link>
          <Link href="/healthy-tiffin-dehradun">Healthy tiffin</Link>
        </div>
        <div className="footer-links">
          <p>Hungry?</p>
          <Link href="/order">Order online</Link>
          <a href={whatsappHref()} target="_blank" rel="noreferrer">Chat on WhatsApp</a>
          <a href={PHONE_HREF}>{CONTACT_PHONE_DISPLAY}</a>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          <span>Monday–Saturday</span>
        </div>
        <div className="footer-links">
          <p>Policies</p>
          <Link href="/refund-policy">Refund &amp; cancellation</Link>
          <Link href="/delivery-policy">Delivery policy</Link>
          <Link href="/terms">Terms of service</Link>
          <Link href="/privacy">Privacy policy</Link>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} Garam Dibba, Dehradun</span>
        <span>Made with warmth, served with character. 🍱</span>
      </div>
    </footer>
  )
}

export function WhatsAppFloat() {
  return (
    <a
      className="whatsapp-float"
      href={whatsappHref()}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle />
      <span>Chat on WhatsApp</span>
    </a>
  )
}
