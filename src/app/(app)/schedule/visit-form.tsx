import Link from 'next/link'
import { deleteVisit, saveVisit } from '@/app/actions/visits'
import { Field, FormActions, FormRow, Panel } from '@/components/ui'
import { VISIT_STATUS } from '@/lib/types'
import type { Client, ServiceCode, Staff } from '@/lib/types'
import type { VisitRow } from '@/lib/queries'

export function VisitForm({
  visit,
  clients,
  staffList,
  services,
  defaults,
  week,
}: {
  visit?: VisitRow
  clients: Client[]
  staffList: Staff[]
  services: ServiceCode[]
  defaults: { date: string; staffId?: number; clientId?: number }
  week: string
}) {
  const v = visit
  return (
    <Panel flush>
      <form action={saveVisit}>
        {v && <input type="hidden" name="id" value={v.id} />}
        <div className="space-y-4 px-4 py-4">
          <FormRow cols={2}>
            <Field label="利用者" required>
              <select
                name="client_id"
                className="field"
                defaultValue={String(v?.client_id ?? defaults.clientId ?? '')}
                required
              >
                <option value="">選択してください</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}（{c.care_level || c.insurance_type}）
                  </option>
                ))}
              </select>
            </Field>
            <Field label="担当職員">
              <select name="staff_id" className="field" defaultValue={String(v?.staff_id ?? defaults.staffId ?? '')}>
                <option value="">未割当</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}（{s.role}）
                  </option>
                ))}
              </select>
            </Field>
          </FormRow>

          <FormRow cols={3}>
            <Field label="訪問日" required>
              <input
                type="date"
                name="date"
                className="field tnum"
                defaultValue={v?.date ?? defaults.date}
                required
              />
            </Field>
            <Field label="開始時刻">
              <input type="time" name="plan_start" className="field tnum" defaultValue={v?.plan_start ?? '09:00'} />
            </Field>
            <Field label="終了時刻">
              <input type="time" name="plan_end" className="field tnum" defaultValue={v?.plan_end ?? '10:00'} />
            </Field>
          </FormRow>

          <Field label="サービス種別">
            <select name="service_code_id" className="field" defaultValue={String(v?.service_code_id ?? '')}>
              <option value="">未選択</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.insurance_type}] {s.name}（{s.unit}単位）
                </option>
              ))}
            </select>
          </Field>

          <FormRow cols={2}>
            <Field label="状態">
              <select name="status" className="field" defaultValue={v?.status ?? '予定'}>
                {VISIT_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="キャンセル理由" hint="キャンセル時のみ入力してください。">
              <input
                name="cancel_reason"
                className="field"
                defaultValue={v?.cancel_reason ?? ''}
                placeholder="例）体調不良のため中止"
              />
            </Field>
          </FormRow>
        </div>

        <FormActions>
          <Link href={`/schedule?week=${week}`} className="btn btn-default">
            キャンセル
          </Link>
          <button type="submit" className="btn btn-primary">
            {v ? '更新する' : '登録する'}
          </button>
        </FormActions>
      </form>

      {v && (
        <form action={deleteVisit} className="border-t border-line px-4 py-3">
          <input type="hidden" name="id" value={v.id} />
          <input type="hidden" name="week" value={week} />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-ink-sub">
              この予定を削除します。記録が入力されている場合は記録も一緒に削除されます。
            </p>
            <button type="submit" className="btn btn-danger btn-sm">
              予定を削除
            </button>
          </div>
        </form>
      )}
    </Panel>
  )
}
