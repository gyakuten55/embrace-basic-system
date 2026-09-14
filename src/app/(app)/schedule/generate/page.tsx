import Link from 'next/link'
import { db } from '@/lib/db'
import { formatMonth, thisMonth } from '@/lib/date'
import { generateSchedule } from '@/app/actions/visits'
import { Breadcrumb, Content, Empty, FormActions, Panel, PageHeader } from '@/components/ui'
import { WEEKDAYS } from '@/lib/types'

export const dynamic = 'force-dynamic'

type PlanRow = {
  client_id: number
  client_name: string
  care_level: string
  plan_id: number
  period_from: string | null
  period_to: string | null
  items: number
}

export default async function GenerateSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; error?: string }>
}) {
  const sp = await searchParams
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : thisMonth()

  const plans = db()
    .prepare(
      `SELECT c.id AS client_id, c.name AS client_name, c.care_level,
              p.id AS plan_id, p.period_from, p.period_to,
              (SELECT COUNT(*) FROM care_plan_items i
                WHERE i.plan_id = p.id AND i.weekday IS NOT NULL AND i.start_time <> '') AS items
       FROM clients c
       JOIN care_plans p ON p.client_id = c.id AND p.status = '同意済'
       WHERE c.status = '利用中'
         AND p.id = (SELECT id FROM care_plans WHERE client_id = c.id ORDER BY revision DESC LIMIT 1)
       ORDER BY c.name_kana`,
    )
    .all() as PlanRow[]

  const detail = db()
    .prepare(
      `SELECT i.plan_id, i.weekday, i.start_time, i.end_time, sc.name AS service_name
       FROM care_plan_items i
       LEFT JOIN service_codes sc ON sc.id = i.service_code_id
       WHERE i.weekday IS NOT NULL AND i.start_time <> ''
       ORDER BY i.weekday, i.start_time`,
    )
    .all() as { plan_id: number; weekday: number; start_time: string; end_time: string; service_name: string | null }[]

  return (
    <>
      <PageHeader
        title="計画書から予定を一括作成"
        sub="同意済の介護計画書に登録された週間パターンをもとに、1か月分の訪問予定をまとめて作ります。"
      />

      <Content className="max-w-4xl space-y-3">
        <Breadcrumb items={[{ label: 'スケジュール', href: '/schedule' }, { label: '一括作成' }]} />

        {sp.error && (
          <p className="rounded border border-ng/25 bg-ng-soft px-3 py-2 text-sm text-ng">{sp.error}</p>
        )}

        <Panel flush>
          <form action={generateSchedule}>
            <div className="border-b border-line px-4 py-3.5">
              <label className="label" htmlFor="month">
                作成する月
              </label>
              <input
                id="month"
                type="month"
                name="month"
                defaultValue={month}
                className="field tnum w-48"
                required
              />
              <p className="hint">
                {formatMonth(month)} の各曜日に、計画書の時間どおりの予定を作ります。
                すでに同じ利用者・同じ日時の予定がある場合は作成しません。
              </p>
            </div>

            {plans.length === 0 ? (
              <Empty
                message="同意済の介護計画書がありません。先に計画書を作成し、同意済にしてください。"
                action={
                  <Link href="/care-plans/new" className="btn btn-primary btn-sm">
                    介護計画書を作成
                  </Link>
                }
              />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-10"></th>
                    <th>利用者</th>
                    <th className="w-28">計画期間</th>
                    <th>週間パターン</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => {
                    const items = detail.filter((d) => d.plan_id === p.plan_id)
                    return (
                      <tr key={p.client_id}>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            name="client_id"
                            value={p.client_id}
                            defaultChecked={p.items > 0}
                            disabled={p.items === 0}
                            className="h-4 w-4 accent-[#17457a]"
                            aria-label={`${p.client_name}を対象にする`}
                          />
                        </td>
                        <td>
                          <div className="text-sm font-medium">{p.client_name}</div>
                          <div className="text-2xs text-ink-mute">{p.care_level}</div>
                        </td>
                        <td className="tnum text-xs text-ink-sub">
                          {p.period_from?.slice(2) ?? '—'}
                          <br />〜{p.period_to?.slice(2) ?? '—'}
                        </td>
                        <td>
                          {items.length === 0 ? (
                            <span className="text-xs text-ink-mute">曜日・時間の登録がありません</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {items.map((d, i) => (
                                <span key={i} className="badge badge-plain tnum">
                                  {WEEKDAYS[d.weekday]} {d.start_time}–{d.end_time}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            <FormActions>
              <Link href="/schedule" className="btn btn-default">
                戻る
              </Link>
              <button type="submit" className="btn btn-primary" disabled={plans.length === 0}>
                予定を作成する
              </button>
            </FormActions>
          </form>
        </Panel>
      </Content>
    </>
  )
}
