import { OrderButton } from '../../site.jsx'

export const metadata = { title: 'Online ordering coming soon | Garam Dibba', robots: { index: false } }

export default function SetupNeededPage() {
  return (
    <main className="app-page">
      <div className="shell app-narrow">
        <div className="app-card">
          <p className="eyebrow">Online ordering</p>
          <h1 className="app-title">Online ordering is almost ready</h1>
          <p className="app-muted">
            Until it opens, you can order your dibba on WhatsApp. We reply quickly.
          </p>
          <OrderButton />
        </div>
      </div>
    </main>
  )
}
