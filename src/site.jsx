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
  whatsappHref,
} from './siteData.js'
import { bowlImages, photos } from './images.js'

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
          </figure>
          <div className="bowl-card-body">
            <span className="menu-index">0{index + 1}</span>
            <h3>{bowl.name}</h3>
            <p>{bowl.blurb}</p>
            <OrderButton
              className="menu-order-link"
              message={`Hi Garam Dibba! I would like to order the ${bowl.name}. 🍱`}
            >
              Order this bowl
            </OrderButton>
          </div>
        </article>
      ))}
    </div>
  )
}

export function HeroMosaic() {
  return (
    <div className="hero-mosaic" aria-hidden="true">
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

export function PlanGrid() {
  return (
    <div className="plan-grid">
      {plans.map((plan) => (
        <article className={plan.best ? 'plan-card is-best' : 'plan-card'} key={plan.id}>
          {plan.best && <span className="plan-badge">Lowest per-box price</span>}
          <h3>{plan.name}</h3>
          <p className="plan-price">
            <span>₹{plan.price}</span>
            <small>/box</small>
          </p>
          <p className="plan-note">{plan.note}</p>
          <OrderButton
            className="menu-order-link"
            message={`Hi Garam Dibba! I would like to start the ${plan.name} (₹${plan.price}/box). 🍱`}
          >
            Choose plan
          </OrderButton>
        </article>
      ))}
    </div>
  )
}

export function PlansSection({
  eyebrow = 'Meal plans & prices',
  title = 'Tiffin Plans That Fit Your Routine',
  intro = 'Whether you’re trying Garam Dibba for a day or planning your meals for the next month, choose the plan that works for you.',
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
            <OrderButton className="button-outline">Order Now</OrderButton>
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
            alt="The founder of Garam Dibba seated at a table in her café, Tea Time"
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
            <p>From a single 1-Day box to a 4-Week plan, Monday to Saturday.</p>
          </article>
          <ChevronRight className="how-arrow" />
          <article>
            <span>3</span>
            <MessageCircle />
            <h3>Order on WhatsApp</h3>
            <p>Your order message opens ready to send. We confirm the details with you.</p>
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
            Tell us what you’d like. Your WhatsApp message is already packed and ready, or call us on{' '}
            <a href={PHONE_HREF}>{CONTACT_PHONE_DISPLAY}</a>.
          </p>
        </div>
        <OrderButton className="button-cream">Chat & order</OrderButton>
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
          <a href={whatsappHref()} target="_blank" rel="noreferrer">Order on WhatsApp</a>
          <a href={PHONE_HREF}>{CONTACT_PHONE_DISPLAY}</a>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          <span>Monday–Saturday</span>
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
      aria-label="Order on WhatsApp"
    >
      <MessageCircle />
      <span>Order on WhatsApp</span>
    </a>
  )
}
