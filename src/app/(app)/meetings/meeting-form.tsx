import Link from 'next/link'
import { saveMeeting } from '@/app/actions/meetings'
import { Field, FormActions, FormRow, Panel } from '@/components/ui'
import { MEETING_KINDS } from '@/lib/types'
import type { Client, Meeting, MeetingAttendee, Staff } from '@/lib/types'
import { AttendeesEditor } from './attendees-editor'

export function MeetingForm({
  meeting,
  attendees,
  clients,
  staffList,
  officeName,
  defaultClientId,
}: {
  meeting?: Meeting
  attendees: MeetingAttendee[]
  clients: Client[]
  staffList: Staff[]
  officeName: string
  defaultClientId?: number
}) {
  const m = meeting
  const today = new Date().toLocaleDateString('sv-SE')

  return (
    <form action={saveMeeting} className="space-y-4">
      {m && <input type="hidden" name="id" value={m.id} />}

      <Panel title="開催情報" flush>
        <div className="space-y-3.5 px-4 py-3.5">
          <FormRow cols={2}>
            <Field label="会議の種別" required>
              <select name="kind" className="field" defaultValue={m?.kind ?? 'サービス担当者会議'}>
                {MEETING_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="対象の利用者" hint="サービス担当者会議のときに選びます。">
              <select
                name="client_id"
                className="field"
                defaultValue={String(m?.client_id ?? defaultClientId ?? '')}
              >
                <option value="">利用者に紐づけない（事業所内会議など）</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}（{c.code}）
                  </option>
                ))}
              </select>
            </Field>
          </FormRow>

          <FormRow cols={4}>
            <Field label="開催日" required>
              <input type="date" name="held_on" className="field tnum" defaultValue={m?.held_on ?? today} required />
            </Field>
            <Field label="開始時刻">
              <input type="time" name="start_time" className="field tnum" defaultValue={m?.start_time ?? ''} />
            </Field>
            <Field label="終了時刻">
              <input type="time" name="end_time" className="field tnum" defaultValue={m?.end_time ?? ''} />
            </Field>
            <Field label="開催場所">
              <input name="place" className="field" defaultValue={m?.place ?? ''} placeholder="○○様宅 / 事業所 会議室" />
            </Field>
          </FormRow>

          <FormRow cols={3}>
            <Field label="司会">
              <input name="chair" className="field" defaultValue={m?.chair ?? ''} />
            </Field>
            <Field label="記録者">
              <select name="recorder_id" className="field" defaultValue={String(m?.recorder_id ?? '')}>
                <option value="">未設定</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="次回開催予定">
              <input type="date" name="next_date" className="field tnum" defaultValue={m?.next_date ?? ''} />
            </Field>
          </FormRow>
        </div>
      </Panel>

      <Panel title="出席者" flush>
        <AttendeesEditor attendees={attendees} officeName={officeName} />
      </Panel>

      <Panel title="会議の内容" flush>
        <div className="space-y-3.5 px-4 py-3.5">
          <Field label="開催目的">
            <textarea
              name="purpose"
              className="field min-h-[3.5rem]"
              defaultValue={m?.purpose ?? ''}
              placeholder="要介護認定更新に伴うケアプラン見直しのため。"
            />
          </Field>
          <Field label="検討内容" hint="誰が何を述べたかが分かるように書きます。実地指導で確認される欄です。">
            <textarea name="discussion" className="field min-h-[9rem]" defaultValue={m?.discussion ?? ''} />
          </Field>
          <Field label="結論">
            <textarea name="conclusion" className="field min-h-[5rem]" defaultValue={m?.conclusion ?? ''} />
          </Field>
          <Field label="残された課題・次回までの宿題">
            <textarea name="todo" className="field min-h-[4rem]" defaultValue={m?.todo ?? ''} />
          </Field>
        </div>
      </Panel>

      <Panel flush>
        <FormActions>
          <Link href={m ? `/meetings/${m.id}` : '/meetings'} className="btn btn-default">
            キャンセル
          </Link>
          <button type="submit" className="btn btn-primary px-6">
            {m ? '更新する' : '登録する'}
          </button>
        </FormActions>
      </Panel>
    </form>
  )
}
