'use client'

import { useState } from 'react'
import { Icon } from '@/components/icons'
import type { MeetingAttendee } from '@/lib/types'

type Row = { key: number; name: string; org: string; role: string }

let nextKey = 1

const PRESET_ROLES = [
  '介護支援専門員',
  'サービス提供責任者',
  '管理者',
  '介護職員',
  '看護職員',
  '福祉用具専門相談員',
  '本人',
  '家族',
  '主治医',
  '相談支援専門員',
]

export function AttendeesEditor({
  attendees,
  officeName,
}: {
  attendees: MeetingAttendee[]
  officeName: string
}) {
  const [rows, setRows] = useState<Row[]>(
    attendees.length > 0
      ? attendees.map((a) => ({ key: nextKey++, name: a.name, org: a.org, role: a.role }))
      : [{ key: nextKey++, name: '', org: officeName, role: 'サービス提供責任者' }],
  )

  const update = (key: number, field: keyof Row, value: string) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)))

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="table min-w-[40rem]">
          <thead>
            <tr>
              <th className="w-48">氏名</th>
              <th>所属</th>
              <th className="w-52">職種・立場</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>
                  <input
                    name="attendee_name"
                    value={row.name}
                    onChange={(e) => update(row.key, 'name', e.target.value)}
                    className="field py-1 text-sm"
                    aria-label="出席者の氏名"
                  />
                </td>
                <td>
                  <input
                    name="attendee_org"
                    value={row.org}
                    onChange={(e) => update(row.key, 'org', e.target.value)}
                    className="field py-1 text-sm"
                    placeholder="事業所名"
                    aria-label="所属"
                  />
                </td>
                <td>
                  <input
                    name="attendee_role"
                    value={row.role}
                    onChange={(e) => update(row.key, 'role', e.target.value)}
                    className="field py-1 text-sm"
                    list="attendee-roles"
                    aria-label="職種・立場"
                  />
                </td>
                <td className="text-right">
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm text-ng"
                    onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== row.key) : rs))}
                    disabled={rows.length === 1}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <datalist id="attendee-roles">
        {PRESET_ROLES.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      <div className="border-t border-line px-4 py-2.5">
        <button
          type="button"
          className="btn btn-default btn-sm"
          onClick={() => setRows((rs) => [...rs, { key: nextKey++, name: '', org: '', role: '' }])}
        >
          <Icon.plus className="h-3 w-3" />
          出席者を追加
        </button>
      </div>
    </div>
  )
}
