'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from './icons'
import type { Staff } from '@/lib/types'

type Item = { href: string; label: string; icon: keyof typeof Icon }
type Group = { heading: string; items: Item[] }

const GROUPS: Group[] = [
  {
    heading: '日々の業務',
    items: [
      { href: '/', label: 'ダッシュボード', icon: 'home' },
      { href: '/schedule', label: 'スケジュール', icon: 'calendar' },
      { href: '/records', label: 'サービス記録', icon: 'pen' },
    ],
  },
  {
    heading: '月末の業務',
    items: [
      { href: '/results', label: '実績・集計', icon: 'chart' },
      { href: '/billing', label: '月締め・請求', icon: 'yen' },
    ],
  },
  {
    heading: '利用者管理',
    items: [
      { href: '/clients', label: '利用者', icon: 'users' },
      { href: '/contracts', label: '契約', icon: 'file' },
      { href: '/care-plans', label: '介護計画書', icon: 'clipboard' },
      { href: '/meetings', label: '会議記録', icon: 'talk' },
    ],
  },
  {
    heading: '事業所管理',
    items: [
      { href: '/attendance', label: '勤怠管理', icon: 'clock' },
      { href: '/staff', label: '職員', icon: 'badge' },
      { href: '/settings', label: '設定', icon: 'gear' },
    ],
  },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <div className="flex-1 overflow-y-auto py-2">
      {GROUPS.map((group) => (
        <div key={group.heading} className="mb-1 px-2">
          <div className="px-2 pb-1 pt-2.5 text-2xs font-medium tracking-wide text-white/35">
            {group.heading}
          </div>
          <ul>
            {group.items.map((item) => {
              const Glyph = Icon[item.icon]
              const on = isActive(pathname, item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={on ? 'page' : undefined}
                    className={[
                      'flex items-center gap-2.5 rounded px-2 py-1.5 text-sm transition-colors',
                      on ? 'bg-accent text-white' : 'text-white/70 hover:bg-navy-hi hover:text-white',
                    ].join(' ')}
                  >
                    <Glyph className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

function Brand({ officeName }: { officeName: string }) {
  return (
    <div className="border-b border-white/10 px-4 py-3">
      <div className="text-sm font-semibold tracking-wide text-white">エンブレイス</div>
      <div className="mt-0.5 truncate text-2xs text-white/50">{officeName}</div>
    </div>
  )
}

export function AppShell({
  officeName,
  staff,
  aiEngine,
  logoutAction,
  children,
}: {
  officeName: string
  staff: Staff
  aiEngine: string
  logoutAction: () => Promise<void>
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => setOpen(false), [pathname])

  return (
    <div className="flex h-screen overflow-hidden print:h-auto print:overflow-visible">
      {/* デスクトップの固定ナビ */}
      <nav className="hidden h-full w-52 shrink-0 flex-col bg-navy text-white/80 lg:flex print:hidden">
        <Brand officeName={officeName} />
        <NavList />
      </nav>

      {/* モバイルのドロワー */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden">
          <button
            type="button"
            aria-label="メニューを閉じる"
            className="absolute inset-0 bg-navy-lo/60"
            onClick={() => setOpen(false)}
          />
          <nav className="relative flex h-full w-60 flex-col bg-navy text-white/80 shadow-xl">
            <Brand officeName={officeName} />
            <NavList onNavigate={() => setOpen(false)} />
          </nav>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-3 sm:px-4 print:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="btn btn-quiet btn-sm px-1.5 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="メニューを開く"
              aria-expanded={open}
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
                <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <span className="truncate text-xs text-ink-sub">
              AI記録整形:{' '}
              <span className={aiEngine === 'Claude API' ? 'text-ok' : 'text-ink'}>{aiEngine}</span>
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden text-xs text-ink-sub sm:inline">
              {staff.name}
              <span className="ml-1.5 text-ink-mute">{staff.role}</span>
            </span>
            <form action={logoutAction}>
              <button type="submit" className="btn btn-quiet btn-sm" title="ログアウト">
                <Icon.out className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">ログアウト</span>
              </button>
            </form>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto print:overflow-visible">{children}</main>
      </div>
    </div>
  )
}
