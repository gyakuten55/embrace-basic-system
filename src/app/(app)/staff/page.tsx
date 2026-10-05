import Link from 'next/link'
import { db } from '@/lib/db'
import { currentStaff, isAdmin } from '@/lib/auth'
import { formatMonth, monthRange, thisMonth } from '@/lib/date'
import { hours, workedMinutes } from '@/lib/attendance'
import { Content, Empty, Panel, PageHeader, StatusBadge } from '@/components/ui'
import { Icon } from '@/components/icons'
import { MonthNav } from '@/components/period-nav'
import type { Attendance, Staff } from '@/lib/types'

export const dynamic = 'force-dynamic'

type Row = Staff & { clients: number; visits: number }

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; saved?: string; error?: string }>
}) {
  const sp = await searchParams
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : thisMonth()
  const { from, to } = monthRange(month)
  const me = await currentStaff()
  const canManage = isAdmin(me)

  const rows = db()
    .prepare(
      `SELECT s.*,
        (SELECT COUNT(DISTINCT v.client_id) FROM visits v
          WHERE v.staff_id = s.id AND v.date BETWEEN ? AND ?) AS clients,
        (SELECT COUNT(*) FROM visits v
          WHERE v.staff_id = s.id AND v.date BETWEEN ? AND ? AND v.status = '実施済') AS visits
       FROM staff s ORDER BY s.active DESC, s.code`,
    )
    .all(from, to, from, to) as Row[]

  const attendance = db()
    .prepare('SELECT * FROM attendances WHERE date BETWEEN ? AND ?')
    .all(from, to) as Attendance[]
  const minutesByStaff = new Map<number, number>()
  for (const a of attendance) {
    minutesByStaff.set(a.staff_id, (minutesByStaff.get(a.staff_id) ?? 0) + workedMinutes(a))
  }

  return (
    <>
      <PageHeader
        title="職員"
        sub={`在籍 ${rows.filter((r) => r.active === 1).length} 名　${formatMonth(month)}の稼働状況`}
        actions={
          <>
            <MonthNav month={month} />
            {canManage && (
              <Link href="/staff/new" className="btn btn-primary">
                <Icon.plus className="h-3.5 w-3.5" />
                職員を登録
              </Link>
            )}
          </>
        }
      />

      <Content className="space-y-3">
        {sp.saved && (
          <p className="notice border-ok/20 bg-ok-soft text-sm text-ok">
            職員情報を保存しました。
          </p>
        )}
        {sp.error && (
          <p className="notice border-ng/20 bg-ng-soft text-sm text-ng">{sp.error}</p>
        )}

        <Panel flush>
          {rows.length === 0 ? (
            <Empty message="職員が登録されていません。" />
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-20">コード</th>
                    <th className="w-40">氏名</th>
                    <th className="w-40">職種</th>
                    <th className="w-24">雇用形態</th>
                    <th className="w-36">保有資格</th>
                    <th className="w-24 text-right">担当利用者</th>
                    <th className="w-24 text-right">訪問件数</th>
                    <th className="w-24 text-right">実働時間</th>
                    <th className="w-20">在籍</th>
                    <th className="w-24 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id}>
                      <td className="tnum text-xs text-ink-sub">{s.code}</td>
                      <td>
                        <Link href={`/attendance/${s.id}?month=${month}`} className="link font-medium">
                          {s.name}
                        </Link>
                        <div className="text-2xs text-ink-mute">{s.name_kana}</div>
                      </td>
                      <td className="text-xs">{s.role}</td>
                      <td className="text-xs text-ink-sub">{s.employment}</td>
                      <td className="text-xs text-ink-sub">{s.qualification || '—'}</td>
                      <td className="tnum text-right">{s.clients}</td>
                      <td className="tnum text-right">{s.visits}</td>
                      <td className="tnum text-right">{hours(minutesByStaff.get(s.id) ?? 0)}h</td>
                      <td>
                        <StatusBadge value={s.active === 1 ? '在籍' : '退職'} />
                      </td>
                      <td className="text-right">
                        {canManage && (
                          <Link href={`/staff/${s.id}/edit`} className="link text-xs">
                            編集
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {!canManage && (
          <p className="text-2xs text-ink-mute">
            職員の登録・編集は、管理者またはサービス提供責任者のみ行えます。
          </p>
        )}
      </Content>
    </>
  )
}
