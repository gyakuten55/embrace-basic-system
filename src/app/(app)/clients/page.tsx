import Link from 'next/link'
import { db } from '@/lib/db'
import { age } from '@/lib/date'
import { Content, Empty, Panel, PageHeader, StatusBadge } from '@/components/ui'
import { Icon } from '@/components/icons'
import type { Client } from '@/lib/types'

export const dynamic = 'force-dynamic'

type Row = Client & { visits_this_month: number; has_plan: number }

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const status = sp.status ?? '利用中'

  const where: string[] = []
  const args: (string | number)[] = []
  if (status && status !== 'all') {
    where.push('c.status = ?')
    args.push(status)
  }
  if (q) {
    where.push('(c.name LIKE ? OR c.name_kana LIKE ? OR c.code LIKE ? OR c.care_manager LIKE ?)')
    args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`)
  }

  const rows = db()
    .prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM visits v
          WHERE v.client_id = c.id AND substr(v.date,1,7) = strftime('%Y-%m','now','localtime')
            AND v.status <> 'キャンセル') AS visits_this_month,
        (SELECT COUNT(*) FROM care_plans p WHERE p.client_id = c.id AND p.status = '同意済') AS has_plan
       FROM clients c
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY c.status, c.name_kana, c.code`,
    )
    .all(...args) as Row[]

  const counts = db()
    .prepare('SELECT status, COUNT(*) AS n FROM clients GROUP BY status')
    .all() as { status: string; n: number }[]
  const total = counts.reduce((s, c) => s + c.n, 0)

  return (
    <>
      <PageHeader
        title="利用者"
        sub={`登録 ${total} 名　利用中 ${counts.find((c) => c.status === '利用中')?.n ?? 0} 名`}
        actions={
          <Link href="/clients/new" className="btn btn-primary">
            <Icon.plus className="h-3.5 w-3.5" />
            利用者を登録
          </Link>
        }
      />

      <Content className="space-y-3">
        <form className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Icon.search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-mute" />
            <input
              name="q"
              defaultValue={q}
              className="field w-64 pl-8"
              placeholder="氏名・フリガナ・番号・ケアマネで検索"
            />
          </div>
          <select name="status" defaultValue={status} className="field w-auto">
            <option value="利用中">利用中</option>
            <option value="休止中">休止中</option>
            <option value="終了">終了</option>
            <option value="all">すべて</option>
          </select>
          <button type="submit" className="btn btn-default">
            検索
          </button>
          {(q || status !== '利用中') && (
            <Link href="/clients" className="btn btn-quiet btn-sm">
              条件をクリア
            </Link>
          )}
        </form>

        <Panel flush>
          {rows.length === 0 ? (
            <Empty message="該当する利用者がいません。" />
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-20">番号</th>
                    <th className="w-48">氏名</th>
                    <th className="w-16">年齢</th>
                    <th className="w-24">要介護度</th>
                    <th className="w-24">保険</th>
                    <th>担当ケアマネ / 事業所</th>
                    <th className="w-24 text-right">今月の訪問</th>
                    <th className="w-24">計画書</th>
                    <th className="w-20">状況</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td className="tnum text-xs text-ink-sub">{c.code}</td>
                      <td>
                        <Link href={`/clients/${c.id}`} className="link font-medium">
                          {c.name}
                        </Link>
                        <div className="text-2xs text-ink-mute">{c.name_kana}</div>
                      </td>
                      <td className="tnum text-ink-sub">{age(c.birth_date) ?? '—'}</td>
                      <td>
                        <span className="badge badge-plain">{c.care_level || '未設定'}</span>
                      </td>
                      <td className="text-xs text-ink-sub">{c.insurance_type}</td>
                      <td className="text-xs text-ink-sub">
                        {c.care_manager || '—'}
                        {c.care_office && <div className="text-2xs text-ink-mute">{c.care_office}</div>}
                      </td>
                      <td className="tnum text-right">{c.visits_this_month}</td>
                      <td>
                        {c.has_plan > 0 ? (
                          <StatusBadge value="同意済" />
                        ) : (
                          <span className="badge badge-warn">未作成</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge value={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </Content>
    </>
  )
}
