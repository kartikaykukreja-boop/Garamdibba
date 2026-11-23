import { DELIVERY_STATUS } from '../lib/status.js'

export default function StatusPill({ status, map = DELIVERY_STATUS }) {
  const entry = map[status] ?? { label: status, tone: 'neutral' }
  return <span className={`status-pill status-${entry.tone}`}>{entry.label}</span>
}
