import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { clientById, officeInfo } from '@/lib/queries'
import { formatMonth, monthDates, monthRange, thisMonth, WEEKDAY_JP, isoToDate } from '@/lib/date'
import { Breadcrumb, Content, PageHeader } from '@/components/ui'
import { PrintButton } from '@/components/print-button'
import { MonthNav } from '@/components/period-nav'

export const dynamic = 'force-dynamic'

type VisitDetail = {
  id: number
  date: string
  plan_start: string
  plan_end: string
  actual_start: string
  actual_end: string
  status: string
  cancel_reason: string
  service_name: string | null
  service_minutes: number | null
  service_unit: number | null
  staff_name: string | null
  note: string | null
  condition: string | null
  temperature: number | null
}

export default async function ClientResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{ month?: string }>
}) {
  const { clientId } = await params
  const sp = await searchParams
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : thisMonth()
  const client = clientById(Number(clientId))
  if (!client) notFound()

  const { from, to } = monthRange(month)
  const visits = db()
    .prepare(
      `SELECT v.id, v.date, v.plan_start, v.plan_end, v.actual_start, v.actual_end, v.status,
              v.cancel_reason, sc.name AS service_name, sc.minutes AS service_minutes,
              sc.unit AS service_unit, s.name AS staff_name,
              r.note, r.condition, r.temperature
       FROM visits v
       LEFT JOIN service_codes sc ON sc.id = v.service_code_id
       LEFT JOIN staff s ON s.id = v.staff_id
       LEFT JOIN visit_records r ON r.visit_id = v.id
       WHERE v.client_id = ? AND v.date BETWEEN ? AND ?
       ORDER BY v.date, v.plan_start`,
    )
    .all(client.id, from, to) as VisitDetail[]

  const done = visits.filter((v) => v.status === '実施済')
  const cancelled = visits.filter((v) => v.status === 'キャンセル')
  const totalMinutes = done.reduce((s, v) => s + (v.service_minutes ?? 0), 0)
  const totalUnits = done.reduce((s, v) => s + (v.service_unit ?? 0), 0)
  const office = officeInfo()
  const days = monthDates(month)
  const byDate = new Map<string, VisitDetail[]>()
  for (const v of visits) {
    byDate.set(v.date, [...(byDate.get(v.date) ?? []), v])
  }

  return (
    <>
      <PageHeader
        title={`${client.name} 様　${formatMonth(month)}の実績`}
        sub={`実施 ${done.length} 件　キャンセル ${cancelled.length} 件　のべ ${(totalMinutes / 60).toFixed(1)} 時間　${totalUnits.toLocaleString()} 単位`}
        actions={
          <>
            <MonthNav month={month} />
            <PrintButton label="実績表を印刷" />
          </>
        }
      />

      <Content>
        <Breadcrumb
          items={[
            { label: '実績・集計', href: `/results?month=${month}` },
            { label: client.name },
          ]}
        />

        <article className="sheet mt-3 bg-white p-8 print:p-0">
          <header className="border-b-2 border-ink pb-3">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-wide">サービス提供実績記録票</h2>
              <div className="text-right text-xs leading-5 text-ink-sub">
                <div>{office?.name}</div>
                <div className="tnum">事業所番号 {office?.office_number}</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-1 text-sm">
              <div>
                <span className="text-xs text-ink-sub">対象月</span>
                <span className="tnum ml-2 font-medium">{formatMonth(month)}</span>
              </div>
              <div>
                <span className="text-xs text-ink-sub">利用者</span>
                <span className="ml-2 font-medium">{client.name}</span>
                <span className="tnum ml-2 text-xs text-ink-sub">{client.code}</span>
              </div>
              <div>
                <span className="text-xs text-ink-sub">被保険者番号</span>
                <span className="tnum ml-2">{client.insured_number || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-ink-sub">要介護度</span>
                <span className="ml-2">{client.care_level || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-ink-sub">担当ケアマネ</span>
                <span className="ml-2">{client.care_manager || '—'}</span>
              </div>
            </div>
          </header>

          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr className="bg-line-soft">
                <th className="w-16 border border-line-hard px-1 py-1.5 text-xs font-semibold">日付</th>
                <th className="w-24 border border-line-hard px-1 py-1.5 text-xs font-semibold">予定</th>
                <th className="w-24 border border-line-hard px-1 py-1.5 text-xs font-semibold">実績</th>
                <th className="w-44 border border-line-hard px-2 py-1.5 text-xs font-semibold">サービス種別</th>
                <th className="w-24 border border-line-hard px-2 py-1.5 text-xs font-semibold">担当</th>
                <th className="w-16 border border-line-hard px-1 py-1.5 text-xs font-semibold">単位</th>
                <th className="border border-line-hard px-2 py-1.5 text-xs font-semibold">サービス提供内容・特記事項</th>
              </tr>
            </thead>
            <tbody>
              {days.map((date) => {
                const items = byDate.get(date) ?? []
                if (items.length === 0) return null
                const wd = isoToDate(date).getDay()
                return items.map((v, i) => (
                  <tr key={v.id} className={v.status === 'キャンセル' ? 'bg-ng-soft/40' : ''}>
                    {i === 0 && (
                      <td
                        rowSpan={items.length}
                        className={`tnum border border-line-hard px-1 py-1.5 text-center align-top ${
                          wd === 0 ? 'text-ng' : wd === 6 ? 'text-accent' : ''
                        }`}
                      >
                        {Number(date.slice(8))}
                        <span className="ml-0.5 text-2xs">({WEEKDAY_JP[wd]})</span>
                      </td>
                    )}
                    <td className="tnum border border-line-hard px-1 py-1.5 text-center text-xs text-ink-sub">
                      {v.plan_start}–{v.plan_end}
                    </td>
                    <td className="tnum border border-line-hard px-1 py-1.5 text-center text-xs">
                      {v.status === 'キャンセル' ? (
                        <span className="text-ng">中止</span>
                      ) : v.actual_start ? (
                        `${v.actual_start}–${v.actual_end}`
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="border border-line-hard px-2 py-1.5 text-xs">{v.service_name ?? '—'}</td>
                    <td className="border border-line-hard px-2 py-1.5 text-xs">{v.staff_name ?? '—'}</td>
                    <td className="tnum border border-line-hard px-1 py-1.5 text-right text-xs">
                      {v.status === '実施済' ? (v.service_unit ?? 0) : '—'}
                    </td>
                    <td className="border border-line-hard px-2 py-1.5 text-xs leading-relaxed">
                      {v.status === 'キャンセル' ? (
                        <span className="text-ng">中止：{v.cancel_reason || '理由未入力'}</span>
                      ) : v.note ? (
                        <>
                          {v.temperature !== null && (
                            <span className="tnum mr-2 text-ink-sub">体温 {v.temperature}℃</span>
                          )}
                          {v.note}
                        </>
                      ) : (
                        <span className="text-warn">記録未入力</span>
                      )}
                    </td>
                  </tr>
                ))
              })}
              {visits.length === 0 && (
                <tr>
                  <td colSpan={7} className="border border-line-hard px-2 py-8 text-center text-sm text-ink-sub">
                    この月の訪問はありません。
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-line-soft font-medium">
                <td colSpan={5} className="border border-line-hard px-2 py-1.5 text-right text-xs">
                  実施 {done.length} 件　キャンセル {cancelled.length} 件　のべ {(totalMinutes / 60).toFixed(1)} 時間
                </td>
                <td className="tnum border border-line-hard px-1 py-1.5 text-right">
                  {totalUnits.toLocaleString()}
                </td>
                <td className="border border-line-hard"></td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-6 flex flex-wrap items-end gap-10 text-sm">
            <div>
              <span className="text-xs text-ink-sub">サービス提供責任者</span>
              <div className="mt-0.5 min-w-[14rem] border-b border-ink pb-1" />
            </div>
            <div>
              <span className="text-xs text-ink-sub">利用者確認欄</span>
              <div className="mt-0.5 min-w-[14rem] border-b border-ink pb-1" />
            </div>
          </div>
        </article>

        <p className="mt-3 text-2xs text-ink-mute print:hidden">
          記録が未入力の行は「記録未入力」と表示されます。ケアマネジャーへ提出する前に
          <Link href="/records?view=unrecorded" className="link mx-1">
            未記録一覧
          </Link>
          から入力を済ませてください。
        </p>
      </Content>
    </>
  )
}
