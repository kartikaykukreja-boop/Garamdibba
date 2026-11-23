'use client'

export default function PrintButton() {
  return (
    <button type="button" className="button button-small receipt-print" onClick={() => window.print()}>
      Print or save as PDF
    </button>
  )
}
