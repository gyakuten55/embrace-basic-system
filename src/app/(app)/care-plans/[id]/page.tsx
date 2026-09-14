import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { officeInfo } from '@/lib/queries'
import { age, longDate } from '@/lib/date'
import { duplicatePlan } from '@/app/actions/care-plans'
import { Breadcrumb, Content, PageHeader, StatusBadge } from '@/components/ui'
import { PrintButton } from '@/components/print-button'
import { WEEKDAYS } from '@/lib/types'
import type { CarePlan, CarePlanItem, Client } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const plan = db().prepare('SELECT * FROM care_plans WHERE id = ?').get(Number(id)) as
    | CarePlan
    | undefined
  if (!plan) notFound()

  const client = db().prepare('SELECT * FROM clients WHERE id = ?').get(plan.client_id) as Client
  const author = plan.author_id
    ? (db().prepare('SELECT name, role FROM staff WHERE id = ?').get(plan.author_id) as
        | { name: string; role: string }
        | undefined)
    : undefined
  const items = db()
    .prepare(
      `SELECT i.*, sc.name AS service_name FROM care_plan_items i
       LEFT JOIN service_codes sc ON sc.id = i.service_code_id
       WHERE i.plan_id = ? ORDER BY
         CASE WHEN i.weekday IS NULL THEN 9 ELSE (i.weekday + 6) % 7 END, i.start_time`,
    )
    .all(plan.id) as (CarePlanItem & { service_name: string | null })[]
  const office = officeInfo()

  return (
    <>
      <PageHeader
        title="訪問介護計画書"
        sub={`${client.name} 様　第${plan.revision}版`}
        actions={
          <>
            <StatusBadge value={plan.status} />
            <form action={duplicatePlan}>
              <input type="hidden" name="id" value={plan.id} />
              <button type="submit" className="btn btn-default">
                次の版として複製
              </button>
            </form>
            <PrintButton />
            <Link href={`/care-plans/${plan.id}/edit`} className="btn btn-primary">
              編集
            </Link>
          </>
        }
      />

      <Content>
        <Breadcrumb
          items={[
            { label: '介護計画書', href: '/care-plans' },
            { label: client.name, href: `/clients/${client.id}` },
            { label: `第${plan.revision}版` },
          ]}
        />

        <article className="sheet mt-3 mx-auto max-w-4xl bg-white p-8 print:max-w-none print:p-0">
          <header className="border-b-2 border-ink pb-3">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-wide">訪問介護計画書</h2>
              <div className="text-right text-xs leading-5 text-ink-sub">
                <div>{office?.name}</div>
                <div className="tnum">事業所番号 {office?.office_number}</div>
                <div className="tnum">作成日 {plan.created_on}</div>
              </div>
            </div>
          </header>

          <table className="mt-4 w-full border-collapse text-sm">
            <tbody>
              <Row label="利用者氏名">
                <span className="text-base font-medium">{client.name}</span>
                <span className="ml-3 text-xs text-ink-sub">
                  {client.name_kana}
                  {age(client.birth_date) !== null && `　${age(client.birth_date)}歳`}
                  {client.gender && `　${client.gender}`}
                </span>
              </Row>
              <Row label="要介護度">
                {client.care_level || '—'}
                <span className="ml-4 text-xs text-ink-sub">
                  認定期間 {client.certified_from ?? '—'} 〜 {client.certified_to ?? '—'}
                </span>
              </Row>
              <Row label="計画期間">
                <span className="tnum">
                  {longDate(plan.period_from)} 〜 {longDate(plan.period_to)}
                </span>
              </Row>
              <Row label="作成者">
                {author ? `${author.name}（${author.role}）` : '—'}
              </Row>
              <Row label="本人の意向">
                <p className="whitespace-pre-wrap leading-relaxed">{plan.client_intention || '—'}</p>
              </Row>
              <Row label="家族の意向">
                <p className="whitespace-pre-wrap leading-relaxed">{plan.family_intention || '—'}</p>
              </Row>
              <Row label="援助の方針">
                <p className="whitespace-pre-wrap leading-relaxed">{plan.overall_policy || '—'}</p>
              </Row>
              <Row label="長期目標">
                {plan.long_goal || '—'}
                {plan.long_goal_period && (
                  <span className="ml-3 text-xs text-ink-sub">（期間 {plan.long_goal_period}）</span>
                )}
              </Row>
              <Row label="短期目標">
                {plan.short_goal || '—'}
                {plan.short_goal_period && (
                  <span className="ml-3 text-xs text-ink-sub">（期間 {plan.short_goal_period}）</span>
                )}
              </Row>
            </tbody>
          </table>

          <h3 className="mt-6 text-sm font-semibold">週間サービス内容</h3>
          <table className="mt-2 w-full border-collapse text-sm">
            <thead>
              <tr className="bg-line-soft">
                <th className="w-14 border border-line-hard px-2 py-1.5 text-xs font-semibold">曜日</th>
                <th className="w-28 border border-line-hard px-2 py-1.5 text-xs font-semibold">時間</th>
                <th className="w-48 border border-line-hard px-2 py-1.5 text-xs font-semibold">サービス種別</th>
                <th className="border border-line-hard px-2 py-1.5 text-xs font-semibold">援助内容</th>
                <th className="border border-line-hard px-2 py-1.5 text-xs font-semibold">留意事項</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-line-hard px-2 py-6 text-center text-xs text-ink-sub">
                    明細が登録されていません。
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td className="border border-line-hard px-2 py-1.5 text-center">
                      {item.weekday === null ? '随時' : WEEKDAYS[item.weekday]}
                    </td>
                    <td className="tnum border border-line-hard px-2 py-1.5 text-center text-xs">
                      {item.start_time && item.end_time ? `${item.start_time}–${item.end_time}` : '—'}
                    </td>
                    <td className="border border-line-hard px-2 py-1.5 text-xs">{item.service_name ?? '—'}</td>
                    <td className="border border-line-hard px-2 py-1.5 leading-relaxed">{item.content}</td>
                    <td className="border border-line-hard px-2 py-1.5 text-xs leading-relaxed text-ink-sub">
                      {item.caution || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {plan.note && (
            <>
              <h3 className="mt-6 text-sm font-semibold">備考</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{plan.note}</p>
            </>
          )}

          <div className="mt-8 border-t border-line pt-4 text-sm">
            <p className="leading-relaxed">
              上記の訪問介護計画について説明を受け、同意しました。
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-8">
              <div>
                <span className="text-xs text-ink-sub">同意日</span>
                <div className="tnum mt-0.5 min-w-[12rem] border-b border-ink pb-1">
                  {plan.consent_on ? longDate(plan.consent_on) : ''}
                </div>
              </div>
              <div>
                <span className="text-xs text-ink-sub">利用者（代理人）署名</span>
                <div className="mt-0.5 min-w-[16rem] border-b border-ink pb-1">{plan.consent_name}</div>
              </div>
            </div>
          </div>
        </article>
      </Content>
    </>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <th className="w-32 border border-line-hard bg-line-soft px-2 py-1.5 text-left align-top text-xs font-semibold">
        {label}
      </th>
      <td className="border border-line-hard px-2 py-1.5 align-top">{children}</td>
    </tr>
  )
}
