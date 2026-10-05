import Link from 'next/link'

export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: string
  sub?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 px-4 pb-1 pt-5 sm:px-6 sm:pt-7 lg:px-10 print:px-0 print:pt-0">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 print:hidden">{actions}</div>}
    </div>
  )
}

export function Content({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-4 py-5 sm:px-6 lg:px-10 print:px-0 ${className}`}>{children}</div>
}

export function Panel({
  title,
  actions,
  children,
  flush = false,
  className = '',
}: {
  title?: string
  actions?: React.ReactNode
  children: React.ReactNode
  flush?: boolean
  className?: string
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-head">
          <h2 className="panel-title">{title}</h2>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {flush ? children : <div className="panel-body">{children}</div>}
    </section>
  )
}

export function Empty({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M4 10.5 8 14l8-8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-sm text-ink-sub">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

const BADGE_TONE: Record<string, string> = {
  実施済: 'badge-ok',
  記録済: 'badge-ok',
  同意済: 'badge-ok',
  有効: 'badge-ok',
  利用中: 'badge-ok',
  出勤: 'badge-ok',
  予定: 'badge-plain',
  下書き: 'badge-warn',
  更新待ち: 'badge-warn',
  休止中: 'badge-warn',
  有給: 'badge-accent',
  直行直帰: 'badge-accent',
  キャンセル: 'badge-ng',
  欠勤: 'badge-ng',
  終了: 'badge-plain',
  休日: 'badge-plain',
  未記録: 'badge-warn',
}

export function StatusBadge({ value }: { value: string }) {
  return <span className={`badge ${BADGE_TONE[value] ?? 'badge-plain'}`}>{value}</span>
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-xs text-ink-sub print:hidden">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && (
            <svg viewBox="0 0 8 12" className="h-2.5 w-2 text-ink-mute" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="m2 2 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {item.href ? (
            <Link href={item.href} className="font-medium hover:text-accent">
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-ink">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

export function Field({
  label,
  children,
  hint,
  required,
  className = '',
}: {
  label: string
  children: React.ReactNode
  hint?: string
  required?: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <div className="label">
        {label}
        {required && <span className="ml-1 text-ng">*</span>}
      </div>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  )
}

export function FormRow({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 | 3 | 4 }) {
  const map = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' }
  return <div className={`grid grid-cols-1 gap-x-5 gap-y-4 ${map[cols]}`}>{children}</div>
}

export function FormActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 rounded-b-xl border-t border-line-soft bg-canvas/60 px-5 py-3.5">
      {children}
    </div>
  )
}

export function Metric({
  label,
  value,
  unit,
  tone = 'plain',
  href,
  icon,
  note,
}: {
  label: string
  value: string | number
  unit?: string
  tone?: 'plain' | 'warn' | 'ok'
  href?: string
  icon?: React.ReactNode
  note?: string
}) {
  const toneText = tone === 'warn' ? 'text-warn' : tone === 'ok' ? 'text-ok' : 'text-ink'
  const toneIcon =
    tone === 'warn' ? 'bg-warn-soft text-warn' : tone === 'ok' ? 'bg-ok-soft text-ok' : 'bg-accent-soft text-accent'
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-ink-sub">{label}</div>
        {icon && <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneIcon}`}>{icon}</div>}
      </div>
      <div className={`mt-2 flex items-baseline gap-1 ${toneText}`}>
        <span className="tnum text-3xl font-bold leading-none tracking-tight">{value}</span>
        {unit && <span className="text-sm font-medium text-ink-sub">{unit}</span>}
      </div>
      {note && <div className="mt-1.5 text-2xs text-ink-mute">{note}</div>}
    </>
  )
  const cls = 'panel block px-5 py-4'
  return href ? (
    <Link href={href} className={`${cls} transition hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-lift`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}
