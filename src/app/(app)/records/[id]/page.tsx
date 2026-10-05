import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { visitById } from '@/lib/queries'
import { longDate, shortDate } from '@/lib/date'
import { Breadcrumb, Content, Panel, PageHeader, StatusBadge } from '@/components/ui'
import { RecordForm, type RecordInitial } from './record-form'
import type { VisitRecord } from '@/lib/types'
import { closedMessage } from '@/lib/billing'

export const dynamic = 'force-dynamic'

export default async function RecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const visit = visitById(Number(id))
  if (!visit) notFound()

  const record = db()
    .prepare('SELECT * FROM visit_records WHERE visit_id = ?')
    .get(visit.id) as VisitRecord | undefined

  const planItems = db()
    .prepare(
      `SELECT i.content, i.caution, i.start_time, i.end_time
       FROM care_plan_items i
       JOIN care_plans p ON p.id = i.plan_id
       WHERE p.client_id = ? AND p.status = '同意済'
         AND p.id = (SELECT id FROM care_plans WHERE client_id = ? ORDER BY revision DESC LIMIT 1)
       ORDER BY i.sort_order`,
    )
    .all(visit.client_id, visit.client_id) as {
    content: string
    caution: string
    start_time: string
    end_time: string
  }[]

  const previous = db()
    .prepare(
      `SELECT v.date, r.note, r.condition, r.temperature
       FROM visits v JOIN visit_records r ON r.visit_id = v.id
       WHERE v.client_id = ? AND v.id <> ? AND v.date <= ?
       ORDER BY v.date DESC, v.plan_start DESC LIMIT 3`,
    )
    .all(visit.client_id, visit.id, visit.date) as {
    date: string
    note: string
    condition: string
    temperature: number | null
  }[]

  const initial: RecordInitial = {
    temperature: record?.temperature?.toString() ?? '',
    bp_high: record?.bp_high?.toString() ?? '',
    bp_low: record?.bp_low?.toString() ?? '',
    pulse: record?.pulse?.toString() ?? '',
    spo2: record?.spo2?.toString() ?? '',
    meal: record?.meal ?? '',
    water_ml: record?.water_ml?.toString() ?? '',
    excretion: record?.excretion ?? '',
    bathing: record?.bathing ?? '',
    condition: record?.condition ?? '',
    note: record?.note ?? '',
    raw_input: record?.raw_input ?? '',
    performed: safeParse(record?.performed),
    ai_used: record?.ai_used === 1,
  }

  const locked = closedMessage(visit.date)

  return (
    <>
      <PageHeader
        title={`${visit.client_name} 様の記録`}
        sub={`${longDate(visit.date)}　${visit.plan_start}–${visit.plan_end}　${visit.service_name ?? 'サービス未設定'}　担当 ${visit.staff_name ?? '未割当'}`}
        actions={
          <>
            <StatusBadge value={record ? '記録済' : '未記録'} />
            <Link href={`/clients/${visit.client_id}`} className="btn btn-default">
              利用者情報
            </Link>
          </>
        }
      />

      <Content>
        <Breadcrumb
          items={[
            { label: 'サービス記録', href: `/records?date=${visit.date}` },
            { label: visit.client_name },
          ]}
        />

        {(locked || sp.error) && (
          <p className="mt-3 rounded border border-warn/25 bg-warn-soft px-3 py-2 text-sm text-warn">
            {locked ?? sp.error}
          </p>
        )}

        <div className="mt-3 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="min-w-0">
            <RecordForm visit={visit} initial={initial} locked={Boolean(locked)} />
          </div>

          <aside className="space-y-4 xl:sticky xl:top-0 xl:self-start">
            <Panel title="計画書の援助内容" flush>
              {planItems.length === 0 ? (
                <p className="px-4 py-3.5 text-xs text-ink-sub">
                  同意済の介護計画書が登録されていません。
                </p>
              ) : (
                <ul className="divide-y divide-line-soft text-xs">
                  {planItems.map((item, i) => (
                    <li key={i} className="px-4 py-2.5">
                      <div className="tnum text-2xs text-ink-mute">
                        {item.start_time}–{item.end_time}
                      </div>
                      <p className="mt-0.5 leading-relaxed">{item.content}</p>
                      {item.caution && (
                        <p className="mt-1 rounded border border-warn/20 bg-warn-soft px-2 py-1 leading-relaxed text-warn">
                          {item.caution}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="直近の記録" flush>
              {previous.length === 0 ? (
                <p className="px-4 py-3.5 text-xs text-ink-sub">過去の記録はありません。</p>
              ) : (
                <ul className="divide-y divide-line-soft text-xs">
                  {previous.map((p, i) => (
                    <li key={i} className="px-4 py-2.5">
                      <div className="tnum flex items-center gap-2 text-2xs text-ink-mute">
                        {shortDate(p.date)}
                        {p.temperature !== null && <span>{p.temperature}℃</span>}
                      </div>
                      <p className="mt-0.5 line-clamp-3 leading-relaxed text-ink-sub">{p.note}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </aside>
        </div>
      </Content>
    </>
  )
}

function safeParse(json: string | undefined): string[] {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}
