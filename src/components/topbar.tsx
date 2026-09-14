import Link from 'next/link'
import { logout } from '@/app/actions/session'
import { Icon } from './icons'
import type { Staff } from '@/lib/types'

export function Topbar({ staff, aiEngine }: { staff: Staff; aiEngine: string }) {
  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-line bg-white px-4 print:hidden">
      <div className="flex items-center gap-3 text-xs text-ink-sub">
        <span>
          AI記録整形:{' '}
          <span className={aiEngine === 'Claude API' ? 'text-ok' : 'text-ink'}>{aiEngine}</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/staff" className="text-xs text-ink-sub hover:text-ink">
          {staff.name}
          <span className="ml-1.5 text-ink-mute">{staff.role}</span>
        </Link>
        <form action={logout}>
          <button type="submit" className="btn btn-quiet btn-sm" title="ログアウト">
            <Icon.out className="h-3.5 w-3.5" />
            ログアウト
          </button>
        </form>
      </div>
    </header>
  )
}
