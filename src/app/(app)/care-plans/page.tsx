import Link from 'next/link'
import { db } from '@/lib/db'
import { today } from '@/lib/date'
import { Content, Empty, Panel, PageHeader, StatusBadge } from '@/components/ui'
import { Icon } from '@/components/icons'

export const dynamic = 'force-dynamic'

type Row = {
  id: number
  client_id: number
  client_name: string
  care_level: string
  revision: number
  created_on: string
  period_from: string | null
  period_to: string | null
  short_goal: string
  status: string
  author_name: string | null
  items: number
}

export default async function CarePlansPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const sp = await searchParams
  const status = sp.status ?? 'all'

  const rows = db()
    .prepare(
      `SELECT p.id, p.client_id, c.name AS client_name, c.care_level, p.revision, p.created_on,
              p.period_from, p.period_to, p.short_goal, p.status, s.name AS author_name,
              (SELECT COUNT(*) FROM care_plan_items i WHERE i.plan_id = p.id) AS items
       FROM care_plans p
       JOIN clients c ON c.id = p.client_id
       LEFT JOIN staff s ON s.id = p.author_id
       ${status === 'all' ? '' : 'WHERE p.status = ?'}
       ORDER BY p.status, p.period_to, c.name_kana`,
    )
    .all(...(status === 'all' ? [] : [status])) as Row[]

  const nowIso = today()
  const expiring = rows.filter(
    (r) => r.status === '同意済' && r.period_to && r.period_to <= addMonths(nowIso, 2),
  )

  return (
    <>
      <PageHeader
        title="介護計画書"
        sub="訪問介護計画書の作成・更新を管理します。同意済の計画書はスケジュールの一括作成に使えます。"
        actions={
          <Link href="/care-plans/new" className="btn btn-primary">
            <Icon.plus className="h-3.5 w-3.5" />
            計画書を作成
          </Link>
        }
      />

      <Content className="space-y-3">
        {expiring.length > 0 && (
          <p className="rounded border border-warn/25 bg-warn-soft px-3 py-2 text-sm text-warn">
            計画期間の終了が2か月以内の計画書が {expiring.length} 件あります。見直しの準備を進めてください。
          </p>
        )}

        <div className="tabs border-0">
          {[
            { key: 'all', label: 'すべて' },
            { key: '下書き', label: '下書き' },
            { key: '同意済', label: '同意済' },
            { key: '終了', label: '終了' },
          ].map((t) => (
            <Link
              key={t.key}
              href={`/care-plans?status=${t.key}`}
              className={`tab ${status === t.key ? 'tab-on' : ''}`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        <Panel flush>
          {rows.length === 0 ? (
            <Empty
              message="計画書がありません。"
              action={
                <Link href="/care-plans/new" className="btn btn-primary btn-sm">
                  計画書を作成
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-44">利用者</th>
                    <th className="w-14">版</th>
                    <th className="w-24">作成日</th>
                    <th className="w-40">計画期間</th>
                    <th>短期目標</th>
                    <th className="w-20 text-right">明細</th>
                    <th className="w-24">作成者</th>
                    <th className="w-20">状態</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const expired = r.period_to !== null && r.period_to < nowIso
                    return (
                      <tr key={r.id}>
                        <td>
                          <Link href={`/care-plans/${r.id}`} className="link font-medium">
                            {r.client_name}
                          </Link>
                          <div className="text-2xs text-ink-mute">{r.care_level}</div>
                        </td>
                        <td className="tnum">第{r.revision}版</td>
                        <td className="tnum text-xs">{r.created_on}</td>
                        <td className="tnum text-xs text-ink-sub">
                          {r.period_from ?? '—'}
                          <br />〜{r.period_to ?? '—'}
                          {expired && r.status === '同意済' && (
                            <span className="ml-1 badge badge-ng">期間終了</span>
                          )}
                        </td>
                        <td className="line-clamp-2 text-xs text-ink-sub">{r.short_goal || '—'}</td>
                        <td className="tnum text-right text-xs text-ink-sub">{r.items}件</td>
                        <td className="text-xs text-ink-sub">{r.author_name ?? '—'}</td>
                        <td>
                          <StatusBadge value={r.status} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </Content>
    </>
  )
}

function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1 + months, d).toLocaleDateString('sv-SE')
}
