import Link from 'next/link'
import { Mail, MessageCircle, Phone } from 'lucide-react'
import { Eyebrow } from './site.jsx'
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, PHONE_HREF, whatsappHref } from './siteData.js'
import { POLICY_LAST_UPDATED, POLICY_PAGES, skipCutoffText } from './policyText.js'

// Shared shell for the policy pages (refund, terms, privacy, delivery).

export function PolicyPage({ route, eyebrow, title, intro, summary, children }) {
  return (
    <main className="policy-page">
      <section className="page-hero policy-hero">
        <div className="shell policy-hero-inner">
          <Eyebrow light>{eyebrow}</Eyebrow>
          <h1>{title}</h1>
          {intro && <p>{intro}</p>}
        </div>
      </section>

      <div className="shell policy-layout">
        <article className="policy-body">
          <p className="policy-updated">Last updated: {POLICY_LAST_UPDATED}</p>

          {summary && (
            <div className="policy-summary">
              <h2>In short</h2>
              <ul>
                {summary.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          {children}

          <section className="policy-contact">
            <h2>Questions? Just ask.</h2>
            <p>We’re a small kitchen and we read every message. Reach us Monday to Saturday.</p>
            <ul>
              <li>
                <MessageCircle aria-hidden="true" />
                <a href={whatsappHref()} target="_blank" rel="noreferrer">WhatsApp us</a>
              </li>
              <li>
                <Phone aria-hidden="true" />
                <a href={PHONE_HREF}>{CONTACT_PHONE_DISPLAY}</a>
              </li>
              <li>
                <Mail aria-hidden="true" />
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </li>
            </ul>
          </section>
        </article>

        <nav className="policy-nav" aria-label="Policies">
          <p>Policies</p>
          {POLICY_PAGES.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              aria-current={page.href === route ? 'page' : undefined}
            >
              {page.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  )
}

export function PolicySection({ id, title, children }) {
  return (
    <section className="policy-section" id={id}>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

// What happens to a meal credit in each situation (from the ordering spec).
export function CreditTable() {
  const cutoff = skipCutoffText()
  const rows = [
    ['Your meal is delivered, or left where you asked us to leave it', 'Used'],
    [`You skip a meal by ${cutoff}`, 'Kept. Your plan’s end date moves forward.'],
    [`You skip a meal after ${cutoff}`, 'Used. We still deliver the meal.'],
    ['We miss a delivery or get it wrong', 'Kept, and we send you a make-up box.'],
    ['We skip a day for you because that day’s menu has something on your allergy list', 'Kept'],
  ]
  return (
    <div className="policy-table-wrap">
      <table className="policy-table">
        <thead>
          <tr>
            <th scope="col">What happens</th>
            <th scope="col">Your meal credit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([what, credit]) => (
            <tr key={what}>
              <td>{what}</td>
              <td>{credit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
