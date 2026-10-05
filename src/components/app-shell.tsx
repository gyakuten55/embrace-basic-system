'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, LogoMark } from './icons'
import type { Staff } from '@/lib/types'

export type NavCounts = {
  /** 実施済なのに記録がない訪問 */
  unrecorded: number
  /** 前月が締め済みか */
  lastMonthClosed: boolean
}

type Item = {
  href: string
  label: string
  icon: keyof typeof Icon
  badge?: (c: NavCounts) => { text: string; tone: 'warn' | 'ok' } | null
}
type Group = { heading: string; items: Item[] }

// 業務の流れ（予定 → 記録 → 実績 → 締め → 請求）の順に並べる
const GROUPS: Group[] = [
  {
    heading: '毎日の仕事',
    items: [
      { href: '/', label: 'ホーム', icon: 'home' },
      { href: '/schedule', label: 'スケジュール', icon: 'calendar' },
      {
        href: '/records',
        label: 'サービス記録',
        icon: 'pen',
        badge: (c) => (c.unrecorded > 0 ? { text: String(c.unrecorded), tone: 'warn' } : null),
      },
    ],
  },
  {
    heading: '月末の仕事',
    items: [
      { href: '/results', label: '実績・集計', icon: 'chart' },
      {
        href: '/billing',
        label: '月締め・請求',
        icon: 'yen',
        badge: (c) => (c.lastMonthClosed ? null : { text: '未締め', tone: 'warn' }),
      },
    ],
  },
  {
    heading: '利用者のこと',
    items: [
      { href: '/clients', label: '利用者', icon: 'users' },
      { href: '/contracts', label: '契約', icon: 'file' },
      { href: '/care-plans', label: '介護計画書', icon: 'clipboard' },
      { href: '/meetings', label: '会議記録', icon: 'talk' },
    ],
  },
  {
    heading: '事業所',
    items: [
      { href: '/attendance', label: '勤怠管理', icon: 'clock' },
      { href: '/staff', label: '職員', icon: 'badge' },
      { href: '/settings', label: '設定', icon: 'gear' },
    ],
  },
]

// スマートフォン・タブレット下部のタブ（現場でよく使うものだけ）
const TABS: Item[] = [
  { href: '/', label: 'ホーム', icon: 'home' },
  { href: '/schedule', label: '予定', icon: 'calendar' },
  {
    href: '/records',
    label: '記録',
    icon: 'pen',
    badge: (c) => (c.unrecorded > 0 ? { text: String(c.unrecorded), tone: 'warn' } : null),
  },
  { href: '/billing', label: '請求', icon: 'yen' },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function initials(name: string) {
  return name.replace(/\s+/g, '').slice(0, 1)
}

function NavList({ counts, onNavigate }: { counts: NavCounts; onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {GROUPS.map((group) => (
        <div key={group.heading}>
          <div className="px-3 pb-1.5 text-2xs font-semibold tracking-wider text-ink-mute">{group.heading}</div>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Glyph = Icon[item.icon]
              const on = isActive(pathname, item.href)
              const badge = item.badge?.(counts)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={on ? 'page' : undefined}
                    className={[
                      'group relative flex min-h-[40px] items-center gap-3 rounded-lg px-3 text-sm transition',
                      on
                        ? 'bg-accent-soft font-bold text-accent'
                        : 'font-medium text-ink-sub hover:bg-canvas hover:text-ink',
                    ].join(' ')}
                  >
                    {on && <span className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-accent" />}
                    <Glyph
                      className={`h-[18px] w-[18px] shrink-0 ${on ? 'text-accent' : 'text-ink-mute group-hover:text-ink-sub'}`}
                    />
                    <span className="flex-1">{item.label}</span>
                    {badge && (
                      <span
                        className={`tnum rounded-full px-2 py-px text-2xs font-bold ${
                          badge.tone === 'warn' ? 'bg-sun text-white' : 'bg-ok-soft text-ok'
                        }`}
                      >
                        {badge.text}
                      </span>
                    )}
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
    <Link href="/" className="flex items-center gap-3 px-5 pb-2 pt-5">
      <LogoMark className="h-10 w-10 shrink-0" />
      <div className="min-w-0">
        <div className="text-[17px] font-bold leading-tight tracking-tight text-ink">エンブレイス</div>
        <div className="mt-0.5 truncate text-2xs text-ink-mute">{officeName}</div>
      </div>
    </Link>
  )
}

function UserCard({
  staff,
  aiEngine,
  logoutAction,
}: {
  staff: Staff
  aiEngine: string
  logoutAction: () => Promise<void>
}) {
  const live = aiEngine === 'Claude API'
  return (
    <div className="space-y-2 border-t border-line-soft p-3">
      <div
        className="flex items-center gap-2 rounded-lg bg-canvas px-3 py-2 text-2xs text-ink-sub"
        title="記録のAI整形に使っているエンジン"
      >
        <Icon.sparkle className={`h-3.5 w-3.5 ${live ? 'text-accent' : 'text-ink-mute'}`} />
        <span className="flex-1">AI記録整形</span>
        <span className={`font-semibold ${live ? 'text-accent' : 'text-ink'}`}>{aiEngine}</span>
      </div>
      <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
          {initials(staff.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{staff.name}</div>
          <div className="truncate text-2xs text-ink-mute">{staff.role}</div>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="btn btn-quiet btn-sm px-2" title="ログアウト" aria-label="ログアウト">
            <Icon.out className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  )
}

export function AppShell({
  officeName,
  staff,
  aiEngine,
  counts,
  logoutAction,
  children,
}: {
  officeName: string
  staff: Staff
  aiEngine: string
  counts: NavCounts
  logoutAction: () => Promise<void>
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="flex h-[100dvh] overflow-hidden print:h-auto print:overflow-visible">
      {/* デスクトップの固定ナビ */}
      <nav
        aria-label="メインメニュー"
        className="hidden h-full w-64 shrink-0 flex-col border-r border-line bg-white lg:flex print:hidden"
      >
        <Brand officeName={officeName} />
        <NavList counts={counts} />
        <UserCard staff={staff} aiEngine={aiEngine} logoutAction={logoutAction} />
      </nav>

      {/* スマートフォン・タブレットのドロワー */}
      <div
        className={`fixed inset-0 z-50 lg:hidden print:hidden ${open ? '' : 'pointer-events-none'}`}
        inert={!open}
      >
        <button
          type="button"
          aria-label="メニューを閉じる"
          className={`absolute inset-0 bg-navy-lo/50 backdrop-blur-[2px] transition-opacity duration-200 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setOpen(false)}
        />
        <nav
          aria-label="メインメニュー"
          className={`relative flex h-full w-[min(18rem,85vw)] flex-col bg-white shadow-lift transition-transform duration-200 ease-out ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-start justify-between">
            <Brand officeName={officeName} />
            <button
              type="button"
              className="btn btn-quiet mr-3 mt-5 px-2"
              aria-label="メニューを閉じる"
              onClick={() => setOpen(false)}
            >
              <Icon.close className="h-5 w-5" />
            </button>
          </div>
          <NavList counts={counts} onNavigate={() => setOpen(false)} />
          <UserCard staff={staff} aiEngine={aiEngine} logoutAction={logoutAction} />
        </nav>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* スマートフォン・タブレットの上部バー */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-white/90 px-3 backdrop-blur lg:hidden print:hidden">
          <button
            type="button"
            className="btn btn-quiet px-2"
            onClick={() => setOpen(true)}
            aria-label="メニューを開く"
            aria-expanded={open}
          >
            <Icon.menu className="h-6 w-6" />
          </button>
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <LogoMark className="h-7 w-7 shrink-0" />
            <span className="truncate text-base font-bold tracking-tight">エンブレイス</span>
          </Link>
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white"
            title={`${staff.name}（${staff.role}）`}
          >
            {initials(staff.name)}
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto pb-24 lg:pb-10 print:overflow-visible print:pb-0">
          {children}
        </main>

        {/* スマートフォン・タブレット下部のタブ */}
        <nav
          aria-label="よく使うメニュー"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-nav backdrop-blur lg:hidden print:hidden"
        >
          <ul className="mx-auto grid max-w-xl grid-cols-5">
            {TABS.map((tab) => {
              const Glyph = Icon[tab.icon]
              const on = isActive(pathname, tab.href)
              const badge = tab.badge?.(counts)
              return (
                <li key={tab.href}>
                  <Link
                    href={tab.href}
                    aria-current={on ? 'page' : undefined}
                    className={`relative flex h-16 flex-col items-center justify-center gap-1 text-2xs font-semibold ${
                      on ? 'text-accent' : 'text-ink-mute'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-14 items-center justify-center rounded-full transition ${
                        on ? 'bg-accent-soft' : ''
                      }`}
                    >
                      <Glyph className="h-[22px] w-[22px]" />
                    </span>
                    {tab.label}
                    {badge && (
                      <span className="tnum absolute left-1/2 top-1.5 ml-2 min-w-[18px] rounded-full bg-sun px-1 text-center text-[10px] font-bold leading-[18px] text-white">
                        {badge.text}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
            <li>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex h-16 w-full flex-col items-center justify-center gap-1 text-2xs font-semibold text-ink-mute"
              >
                <span className="flex h-8 w-14 items-center justify-center rounded-full">
                  <Icon.menu className="h-[22px] w-[22px]" />
                </span>
                メニュー
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  )
}
