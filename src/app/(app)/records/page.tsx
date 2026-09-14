import Link from 'next/link'
import { addDays, longDate, shortDate, today } from '@/lib/date'
import { activeStaff, unrecordedVisits, visitsBetween } from '@/lib/queries'
import { confirmVisits } from '@/app/actions/visits'
import { Content, Empty, Panel, PageHeader, StatusBadge } from '@/components/ui'
import { DayNav, FilterSelect } from '@/components/period-nav'
import { ConfirmButton } from '@/components/confirm-button'

export const dynamic = 'force-dynamic'

type Search = { date?: string; staff?: string; view?: string; saved?: string }

export default async function RecordsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today()
  const view = sp.view === 'unrecorded' ? 'unrecorded' : 'day'
  const staffFilter = sp.staff ? Number(sp.staff) : undefined

  const dayVisits = visitsBetween(date, date, { staffId: staffFilter })
  const pending = unrecordedVisits(addDays(today(), -60), today()).filter(
    (v) => !staffFilter || v.staff_id === staffFilter,
  )
  const rows = view === 'day' ? dayVisits : pending

  const unrecordedToday = dayVisits.filter((v) => v.status === '実施済' && !v.record_id).length
  const plannedToday = dayVisits.filter((v) => v.status === '予定')

  return (
    <>
      <PageHeader
        title="サービス記録"
        sub="訪問ごとの実績と記録を入力します。音声入力とAI整形で、その場で記録を終わらせられます。"
      />

      <Content className="space-y-3">
        {sp.saved && (
          <p className="rounded border border-ok/25 bg-ok-soft px-3 py-2 text-sm text-ok">
            記録を保存しました。
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="tabs border-0">
            <Link
              href={`/records?date=${date}`}
              className={`tab ${view === 'day' ? 'tab-on' : ''}`}
            >
              日別（{dayVisits.length}）
            </Link>
            <Link
              href={`/records?date=${date}&view=unrecorded`}
              className={`tab ${view === 'unrecorded' ? 'tab-on' : ''}`}
            >
              未記録のみ（{pending.length}）
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {view === 'day' && <DayNav date={date} />}
            <FilterSelect
              name="staff"
              value={sp.staff ?? ''}
              placeholder="職員で絞り込み"
              options={activeStaff().map((s) => ({ value: String(s.id), label: s.name }))}
            />
          </div>
        </div>

        {view === 'day' && unrecordedToday > 0 && (
          <p className="rounded border border-warn/25 bg-warn-soft px-3 py-2 text-sm text-warn">
            この日の実施済みの訪問のうち {unrecordedToday} 件が未記録です。
          </p>
        )}

        <Panel
          title={view === 'day' ? longDate(date) : '過去60日間の未記録'}
          flush
          actions={
            view === 'day' && plannedToday.length > 0 ? (
              <form action={confirmVisits}>
                {plannedToday.map((v) => (
                  <input key={v.id} type="hidden" name="visit_id" value={v.id} />
                ))}
                <ConfirmButton
                  className="btn btn-default btn-sm"
                  message={`この日の予定 ${plannedToday.length} 件を、予定どおり実施したものとして実績に記録します。よろしいですか？`}
                >
                  予定 {plannedToday.length} 件を実施済にする
                </ConfirmButton>
              </form>
            ) : undefined
          }
        >
          {rows.length === 0 ? (
            <Empty
              message={
                view === 'day'
                  ? 'この日の訪問はありません。'
                  : '未記録の訪問はありません。記録はすべて入力済みです。'
              }
              action={
                view === 'day' ? (
                  <Link href={`/schedule/new?date=${date}`} className="btn btn-default btn-sm">
                    訪問予定を追加
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <>
            {/* スマートフォン: 1件ずつのカード表示（ヘルパーが訪問先で使う） */}
            <ul className="divide-y divide-line-soft md:hidden">
              {rows.map((v) => (
                <li key={v.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="tnum text-xs text-ink-sub">
                        {view === 'unrecorded' && <span className="mr-1.5">{shortDate(v.date)}</span>}
                        {v.status === '実施済' && v.actual_start
                          ? `${v.actual_start}–${v.actual_end}`
                          : `${v.plan_start}–${v.plan_end}`}
                      </div>
                      <div className="mt-0.5 text-base font-medium">{v.client_name}</div>
                      <div className="text-xs text-ink-sub">
                        {v.service_name ?? 'サービス未設定'}
                        <span className="mx-1.5 text-line-hard">/</span>
                        {v.staff_name ?? '未割当'}
                      </div>
                    </div>
                    <StatusBadge value={v.status} />
                  </div>

                  <div className="mt-2 flex items-end justify-between gap-3">
                    <p className="line-clamp-2 min-w-0 flex-1 text-xs leading-relaxed text-ink-sub">
                      {v.status === 'キャンセル' ? (
                        v.cancel_reason || '理由未入力'
                      ) : v.record_note ? (
                        v.record_note
                      ) : v.status === '実施済' ? (
                        <StatusBadge value="未記録" />
                      ) : (
                        '訪問後に記録を入力します'
                      )}
                    </p>
                    <Link
                      href={`/records/${v.id}`}
                      className={`btn shrink-0 ${v.record_id ? 'btn-default' : 'btn-primary'}`}
                    >
                      {v.record_id ? '記録を編集' : '記録する'}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="table">
                <thead>
                  <tr>
                    {view === 'unrecorded' && <th className="w-24">日付</th>}
                    <th className="w-28">時間</th>
                    <th className="w-40">利用者</th>
                    <th className="w-28">担当</th>
                    <th className="w-44">サービス</th>
                    <th className="w-20">状態</th>
                    <th>記録</th>
                    <th className="w-24 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((v) => (
                    <tr key={v.id}>
                      {view === 'unrecorded' && (
                        <td className="tnum whitespace-nowrap text-xs text-ink-sub">{shortDate(v.date)}</td>
                      )}
                      <td className="tnum whitespace-nowrap text-ink-sub">
                        {v.status === '実施済' && v.actual_start ? (
                          <>
                            {v.actual_start}–{v.actual_end}
                          </>
                        ) : (
                          <span className="text-ink-mute">
                            {v.plan_start}–{v.plan_end}
                          </span>
                        )}
                      </td>
                      <td>
                        <Link href={`/clients/${v.client_id}`} className="link font-medium">
                          {v.client_name}
                        </Link>
                      </td>
                      <td className="text-xs text-ink-sub">{v.staff_name ?? '未割当'}</td>
                      <td className="text-xs text-ink-sub">{v.service_name ?? '—'}</td>
                      <td>
                        <StatusBadge value={v.status} />
                      </td>
                      <td className="max-w-md">
                        {v.status === 'キャンセル' ? (
                          <span className="text-xs text-ink-sub">{v.cancel_reason || '理由未入力'}</span>
                        ) : v.record_note ? (
                          <span className="line-clamp-2 text-xs leading-relaxed text-ink-sub">
                            {v.record_note}
                          </span>
                        ) : v.status === '実施済' ? (
                          <StatusBadge value="未記録" />
                        ) : (
                          <span className="text-xs text-ink-mute">—</span>
                        )}
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/records/${v.id}`}
                          className={`btn btn-sm ${v.record_id ? 'btn-default' : 'btn-primary'}`}
                        >
                          {v.record_id ? '編集' : '記録する'}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </Panel>
      </Content>
    </>
  )
}
