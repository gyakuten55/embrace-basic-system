import Link from 'next/link'
import { currentStaff } from '@/lib/auth'
import { db } from '@/lib/db'
import { addDays, addMonths, formatMonth, longDate, monthRange, thisMonth, today } from '@/lib/date'
import { unrecordedVisits, upcomingAlerts, visitsBetween } from '@/lib/queries'
import { closingIssues, isMonthClosed, invoicesFor } from '@/lib/billing'
import { Content, Empty, Panel, StatusBadge } from '@/components/ui'
import { Icon } from '@/components/icons'

export const dynamic = 'force-dynamic'

function greeting() {
  const h = new Date().getHours()
  if (h < 11) return 'おはようございます'
  if (h < 17) return 'こんにちは'
  return 'おつかれさまです'
}

type Step = {
  key: string
  label: string
  value: string
  note: string
  href: string
  state: 'done' | 'todo' | 'idle'
  icon: keyof typeof Icon
}

export default async function DashboardPage() {
  const staff = await currentStaff()
  const nowIso = today()
  const month = thisMonth()
  const lastMonth = addMonths(month, -1)
  const { from, to } = monthRange(month)

  const todaysVisits = visitsBetween(nowIso, nowIso)
  const unrecorded = unrecordedVisits(addDays(nowIso, -60), nowIso)
  const alerts = upcomingAlerts(nowIso, addDays(nowIso, 60))

  const monthly = db()
    .prepare(`SELECT status, COUNT(*) AS n FROM visits WHERE date BETWEEN ? AND ? GROUP BY status`)
    .all(from, to) as { status: string; n: number }[]
  const count = (s: string) => monthly.find((m) => m.status === s)?.n ?? 0
  const planned = count('予定')
  const done = count('実施済')
  const cancelled = count('キャンセル')

  const lastClosed = isMonthClosed(lastMonth)
  const lastIssues = lastClosed ? 0 : closingIssues(lastMonth).length
  const lastTotal = lastClosed ? invoicesFor(lastMonth).reduce((s, r) => s + r.total_yen, 0) : 0

  const meetings = db()
    .prepare(
      `SELECT m.id, m.kind, m.held_on, m.place, c.name AS client_name
       FROM meetings m LEFT JOIN clients c ON c.id = m.client_id
       ORDER BY m.held_on DESC LIMIT 4`,
    )
    .all() as { id: number; kind: string; held_on: string; place: string; client_name: string | null }[]

  const mine = todaysVisits.filter((v) => v.staff_id === staff?.id)
  const remaining = todaysVisits.filter((v) => v.status === '予定').length
  const firstName = staff?.name.split(/\s+/)[0] ?? ''

  // 予定 → 記録 → 実績 → 締め → 請求
  const steps: Step[] = [
    {
      key: 'plan',
      label: '予定',
      value: `${planned + done + cancelled}件`,
      note: `今月の訪問予定（残り ${planned} 件）`,
      href: '/schedule',
      state: 'idle',
      icon: 'calendar',
    },
    {
      key: 'record',
      label: '記録',
      value: unrecorded.length > 0 ? `未記録 ${unrecorded.length}` : 'すべて記録済',
      note: '訪問したらその場で音声入力',
      href: unrecorded.length > 0 ? '/records?view=unrecorded' : '/records',
      state: unrecorded.length > 0 ? 'todo' : 'done',
      icon: 'pen',
    },
    {
      key: 'result',
      label: '実績',
      value: `${done}件`,
      note: `今月の実施（中止 ${cancelled} 件）`,
      href: '/results',
      state: 'idle',
      icon: 'chart',
    },
    {
      key: 'close',
      label: '締め',
      value: lastClosed ? '締め済' : lastIssues > 0 ? `残り ${lastIssues} 件` : '締められます',
      note: `${formatMonth(lastMonth)}分`,
      href: `/billing?month=${lastMonth}`,
      state: lastClosed ? 'done' : 'todo',
      icon: 'lock',
    },
    {
      key: 'bill',
      label: '請求',
      value: lastClosed ? `${Math.round(lastTotal / 10000).toLocaleString()}万円` : '締め後に確定',
      note: lastClosed ? `${formatMonth(lastMonth)}分 費用総額` : `${formatMonth(lastMonth)}分`,
      href: `/billing?month=${lastMonth}`,
      state: lastClosed ? 'done' : 'idle',
      icon: 'yen',
    },
  ]

  return (
    <>
      {/* あいさつ */}
      <section className="px-4 pt-5 sm:px-6 sm:pt-7 lg:px-10">
        <div className="relative overflow-hidden rounded-2xl bg-navy px-5 py-5 text-white shadow-lift sm:px-8 sm:py-7">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-accent-hi/40 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-28 right-24 h-56 w-56 rounded-full bg-sun/20 blur-2xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="text-sm font-medium text-white/65">{longDate(nowIso)}</div>
              <h1 className="mt-1 text-[22px] font-bold leading-snug tracking-tight sm:text-3xl">
                {firstName}さん、{greeting()}
              </h1>
              <p className="mt-2 text-sm text-white/75">
                今日の訪問は <b className="tnum text-base text-white">{todaysVisits.length}</b> 件
                {mine.length > 0 && (
                  <>
                    （あなたの担当 <b className="tnum text-base text-white">{mine.length}</b> 件）
                  </>
                )}
                {remaining > 0 && `、これから ${remaining} 件です。`}
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
              <Link
                href="/records"
                className="btn btn-lg px-3 sm:px-6 border-white bg-white text-navy shadow-card hover:border-white hover:bg-accent-soft"
              >
                <Icon.mic className="h-5 w-5" />
                記録をつける
              </Link>
              <Link
                href="/schedule"
                className="btn btn-lg px-3 sm:px-6 border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/15"
              >
                <Icon.calendar className="h-5 w-5" />
                予定を見る
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Content className="flex flex-col gap-6">
        {/* 業務の流れ（スマートフォンでは今日の訪問を先に見せる） */}
        <section aria-labelledby="flow-heading" className="order-last lg:order-none">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="flow-heading" className="text-[15px] font-bold tracking-tight">
              今月の流れ
            </h2>
            <span className="text-2xs text-ink-mute">予定 → 記録 → 実績 → 締め → 請求</span>
          </div>
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {steps.map((s, i) => {
              const Glyph = Icon[s.icon]
              const tone =
                s.state === 'todo'
                  ? 'border-sun/40 bg-sun-soft'
                  : s.state === 'done'
                    ? 'border-ok/20 bg-white'
                    : 'border-line bg-white'
              const iconTone =
                s.state === 'todo'
                  ? 'bg-sun text-white'
                  : s.state === 'done'
                    ? 'bg-ok-soft text-ok'
                    : 'bg-accent-soft text-accent'
              return (
                <li key={s.key} className={i === steps.length - 1 ? 'col-span-2 sm:col-span-1' : ''}>
                  <Link
                    href={s.href}
                    className={`group relative flex h-full flex-col rounded-xl border px-4 py-3.5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift ${tone}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconTone}`}>
                        {s.state === 'done' ? <Icon.check className="h-4 w-4" /> : <Glyph className="h-4 w-4" />}
                      </span>
                      <span className="flex flex-col leading-tight">
                        <span className="text-[10px] font-bold tracking-wider text-ink-mute">STEP {i + 1}</span>
                        <span className="whitespace-nowrap text-sm font-bold">{s.label}</span>
                      </span>
                      <Icon.arrow className="ml-auto h-4 w-4 text-ink-mute opacity-0 transition group-hover:opacity-100" />
                    </div>
                    <div
                      className={`tnum mt-3 text-lg font-bold tracking-tight sm:text-xl ${
                        s.state === 'todo' ? 'text-warn' : s.state === 'done' ? 'text-ok' : 'text-ink'
                      }`}
                    >
                      {s.value}
                    </div>
                    <div className="mt-0.5 text-2xs text-ink-sub">{s.note}</div>
                  </Link>
                </li>
              )
            })}
          </ol>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {/* 今日の訪問 */}
          <Panel
            title="今日の訪問"
            flush
            actions={
              <Link href="/schedule" className="btn btn-quiet btn-sm">
                週間スケジュール
                <Icon.arrow className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {todaysVisits.length === 0 ? (
              <Empty message="今日の訪問予定はありません。" />
            ) : (
              <ul className="divide-y divide-line-soft">
                {todaysVisits.map((v) => {
                  const isMine = v.staff_id === staff?.id
                  const recorded = Boolean(v.record_id)
                  return (
                    <li key={v.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                      <div
                        className={`tnum flex w-[4.5rem] shrink-0 flex-col rounded-lg px-2 py-1.5 text-center ${
                          v.status === 'キャンセル'
                            ? 'bg-line-soft text-ink-mute line-through'
                            : recorded
                              ? 'bg-ok-soft text-ok'
                              : 'bg-accent-soft text-accent'
                        }`}
                      >
                        <span className="text-base font-bold leading-tight">{v.plan_start}</span>
                        <span className="text-2xs opacity-80">〜{v.plan_end}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/clients/${v.client_id}`} className="text-base font-bold hover:text-accent">
                            {v.client_name}
                            <span className="ml-0.5 text-xs font-medium text-ink-sub">様</span>
                          </Link>
                          {isMine && <span className="badge badge-accent">あなたの担当</span>}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-ink-sub">
                          {v.service_name ?? 'サービス未設定'}　·　{v.staff_name ?? '担当未割当'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge value={recorded ? '記録済' : v.status} />
                        {v.status !== 'キャンセル' && (
                          <Link
                            href={`/records/${v.id}`}
                            className={`btn btn-sm ${recorded ? 'btn-default' : 'btn-primary'}`}
                          >
                            {recorded ? '記録を見る' : '記録する'}
                          </Link>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>

          <div className="space-y-6">
            <Panel
              title="気をつけること"
              flush
              actions={
                alerts.length > 0 ? <span className="badge badge-warn">{alerts.length} 件</span> : undefined
              }
            >
              {alerts.length === 0 ? (
                <Empty message="期限の近い事項はありません。" />
              ) : (
                <ul className="divide-y divide-line-soft">
                  {alerts.slice(0, 6).map((a, i) => (
                    <li key={i}>
                      <Link
                        href={`/clients/${a.clientId}`}
                        className="flex items-start gap-3 px-5 py-3 transition hover:bg-canvas"
                      >
                        <span
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                            a.overdue ? 'bg-ng-soft text-ng' : 'bg-warn-soft text-warn'
                          }`}
                        >
                          <Icon.warn className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold">{a.clientName} 様</div>
                          <p className="text-xs text-ink-sub">
                            {a.detail}
                            {a.dueDate && <span className="tnum">　期限 {a.dueDate}</span>}
                          </p>
                        </div>
                        <span className={`badge ${a.overdue ? 'badge-ng' : 'badge-warn'}`}>
                          {a.overdue ? '期限切れ' : 'まもなく'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {alerts.length > 6 && (
                <div className="border-t border-line-soft px-5 py-2.5 text-xs text-ink-sub">ほか {alerts.length - 6} 件</div>
              )}
            </Panel>

            <Panel
              title="最近の会議記録"
              flush
              actions={
                <Link href="/meetings" className="btn btn-quiet btn-sm">
                  すべて見る
                  <Icon.arrow className="h-3.5 w-3.5" />
                </Link>
              }
            >
              {meetings.length === 0 ? (
                <Empty message="会議記録はまだありません。" />
              ) : (
                <ul className="divide-y divide-line-soft">
                  {meetings.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/meetings/${m.id}`}
                        className="flex items-center gap-3 px-5 py-3 transition hover:bg-canvas"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                          <Icon.talk className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">
                            {m.kind}
                            {m.client_name && <span className="font-medium text-ink-sub">（{m.client_name} 様）</span>}
                          </div>
                          <p className="tnum text-xs text-ink-sub">
                            {m.held_on}　{m.place}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </Content>
    </>
  )
}
