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
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-white px-6 py-4 print:border-0 print:px-0">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 print:hidden">{actions}</div>}
    </div>
  )
}

export function Content({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-6 py-5 print:px-0 ${className}`}>{children}</div>
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
    <div className="px-4 py-10 text-center">
      <p className="text-sm text-ink-sub">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

const BADGE_TONE: Record<string, string> = {
  実施済: 'badge-ok',
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
    <nav className="flex items-center gap-1.5 text-xs text-ink-sub print:hidden">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-ink-mute">/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-accent hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-ink">{item.label}</span>
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
  return <div className={`grid grid-cols-1 gap-x-4 gap-y-3.5 ${map[cols]}`}>{children}</div>
}

export function FormActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-line bg-line-soft/40 px-4 py-3">
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
}: {
  label: string
  value: string | number
  unit?: string
  tone?: 'plain' | 'warn' | 'ok'
  href?: string
}) {
  const toneClass =
    tone === 'warn' ? 'text-warn' : tone === 'ok' ? 'text-ok' : 'text-ink'
  const body = (
    <>
      <div className="text-xs text-ink-sub">{label}</div>
      <div className={`mt-1.5 flex items-baseline gap-1 ${toneClass}`}>
        <span className="tnum text-2xl font-semibold leading-none">{value}</span>
        {unit && <span className="text-xs text-ink-sub">{unit}</span>}
      </div>
    </>
  )
  const cls = 'panel px-4 py-3'
  return href ? (
    <Link href={href} className={`${cls} block transition-colors hover:border-accent/40 hover:bg-accent-soft/40`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}
