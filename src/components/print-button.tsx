'use client'

import { Icon } from './icons'

export function PrintButton({ label = '印刷' }: { label?: string }) {
  return (
    <button type="button" className="btn btn-default btn-sm print:hidden" onClick={() => window.print()}>
      <Icon.print className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}
