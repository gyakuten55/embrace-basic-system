import Link from 'next/link'
import { saveStaff } from '@/app/actions/staff'
import { Field, FormActions, FormRow, Panel } from '@/components/ui'
import { EMPLOYMENT_TYPES, STAFF_ROLES } from '@/lib/types'
import type { Staff } from '@/lib/types'

export function StaffForm({ staff }: { staff?: Staff }) {
  const s = staff
  return (
    <form action={saveStaff} className="space-y-4">
      {s && <input type="hidden" name="id" value={s.id} />}

      <Panel title="職員情報" flush>
        <div className="space-y-3.5 px-4 py-3.5">
          <FormRow cols={3}>
            <Field label="職員コード" required hint="ログインIDとして使います。">
              <input name="code" className="field tnum" defaultValue={s?.code ?? ''} required />
            </Field>
            <Field label="氏名" required>
              <input name="name" className="field" defaultValue={s?.name ?? ''} required />
            </Field>
            <Field label="フリガナ">
              <input name="name_kana" className="field" defaultValue={s?.name_kana ?? ''} />
            </Field>
          </FormRow>

          <FormRow cols={4}>
            <Field label="職種">
              <select name="role" className="field" defaultValue={s?.role ?? '介護職員'}>
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="雇用形態">
              <select name="employment" className="field" defaultValue={s?.employment ?? '常勤'}>
                {EMPLOYMENT_TYPES.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="保有資格">
              <input
                name="qualification"
                className="field"
                defaultValue={s?.qualification ?? ''}
                placeholder="介護福祉士 / 初任者研修"
              />
            </Field>
            <Field label="時給（円）" hint="勤怠画面の概算に使います。">
              <input
                type="number"
                name="hourly_wage"
                className="field tnum"
                defaultValue={String(s?.hourly_wage ?? 0)}
              />
            </Field>
          </FormRow>

          <FormRow cols={3}>
            <Field label="電話番号">
              <input name="phone" className="field tnum" defaultValue={s?.phone ?? ''} />
            </Field>
            <Field label="入職日">
              <input type="date" name="joined_on" className="field tnum" defaultValue={s?.joined_on ?? ''} />
            </Field>
            <Field label="在籍状況">
              <select name="active" className="field" defaultValue={String(s?.active ?? 1)}>
                <option value="1">在籍</option>
                <option value="0">退職</option>
              </select>
            </Field>
          </FormRow>

          {!s && (
            <Field
              label="初期パスワード"
              hint="空欄の場合は embrace が設定されます。本人が初回ログイン後に変更してください。"
            >
              <input name="password" className="field" placeholder="embrace" />
            </Field>
          )}
        </div>
      </Panel>

      <Panel flush>
        <FormActions>
          <Link href="/staff" className="btn btn-default">
            キャンセル
          </Link>
          <button type="submit" className="btn btn-primary px-6">
            {s ? '更新する' : '登録する'}
          </button>
        </FormActions>
      </Panel>
    </form>
  )
}
