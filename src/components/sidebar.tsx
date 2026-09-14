'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from './icons'

type Item = { href: string; label: string; icon: keyof typeof Icon }
type Group = { heading: string; items: Item[] }

const GROUPS: Group[] = [
  {
    heading: '日々の業務',
    items: [
      { href: '/', label: 'ダッシュボード', icon: 'home' },
      { href: '/schedule', label: 'スケジュール', icon: 'calendar' },
      { href: '/records', label: 'サービス記録', icon: 'pen' },
      { href: '/results', label: '実績・集計', icon: 'chart' },
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
      { href: '/staff', label: '職員', icon: 'users' },
      { href: '/settings', label: '設定', icon: 'gear' },
    ],
  },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Sidebar({ officeName }: { officeName: string }) {
  const pathname = usePathname()

  return (
    <nav className="flex h-full w-52 shrink-0 flex-col bg-navy text-white/80 print:hidden">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="text-sm font-semibold tracking-wide text-white">エンブレース</div>
        <div className="mt-0.5 truncate text-2xs text-white/50">{officeName}</div>
      </div>

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
                      className={[
                        'flex items-center gap-2.5 rounded px-2 py-1.5 text-sm transition-colors',
                        on
                          ? 'bg-accent text-white'
                          : 'text-white/70 hover:bg-navy-hi hover:text-white',
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
    </nav>
  )
}
