import Link from 'next/link'
import { saveClient } from '@/app/actions/clients'
import { Field, FormActions, FormRow, Panel } from '@/components/ui'
import { CARE_LEVELS, CLIENT_STATUS, INSURANCE_TYPES } from '@/lib/types'
import type { Client } from '@/lib/types'

export function ClientForm({ client, nextCode }: { client?: Client; nextCode?: string }) {
  const c = client
  return (
    <form action={saveClient} className="space-y-4">
      {c && <input type="hidden" name="id" value={c.id} />}

      <Panel title="基本情報" flush>
        <div className="space-y-3.5 px-4 py-3.5">
          <FormRow cols={3}>
            <Field label="利用者番号" required>
              <input name="code" className="field tnum" defaultValue={c?.code ?? nextCode ?? ''} required />
            </Field>
            <Field label="氏名" required>
              <input name="name" className="field" defaultValue={c?.name ?? ''} required />
            </Field>
            <Field label="フリガナ">
              <input name="name_kana" className="field" defaultValue={c?.name_kana ?? ''} />
            </Field>
          </FormRow>

          <FormRow cols={3}>
            <Field label="生年月日">
              <input type="date" name="birth_date" className="field tnum" defaultValue={c?.birth_date ?? ''} />
            </Field>
            <Field label="性別">
              <select name="gender" className="field" defaultValue={c?.gender ?? ''}>
                <option value="">未設定</option>
                <option value="女性">女性</option>
                <option value="男性">男性</option>
              </select>
            </Field>
            <Field label="利用状況">
              <select name="status" className="field" defaultValue={c?.status ?? '利用中'}>
                {CLIENT_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </FormRow>

          <FormRow cols={3}>
            <Field label="郵便番号">
              <input name="postal_code" className="field tnum" defaultValue={c?.postal_code ?? ''} placeholder="550-0014" />
            </Field>
            <Field label="住所" className="sm:col-span-2">
              <input name="address" className="field" defaultValue={c?.address ?? ''} />
            </Field>
          </FormRow>

          <FormRow cols={3}>
            <Field label="電話番号">
              <input name="phone" className="field tnum" defaultValue={c?.phone ?? ''} />
            </Field>
            <Field label="サービス開始日">
              <input type="date" name="started_on" className="field tnum" defaultValue={c?.started_on ?? ''} />
            </Field>
            <Field label="サービス終了日">
              <input type="date" name="ended_on" className="field tnum" defaultValue={c?.ended_on ?? ''} />
            </Field>
          </FormRow>
        </div>
      </Panel>

      <Panel title="保険・認定情報" flush>
        <div className="space-y-3.5 px-4 py-3.5">
          <FormRow cols={4}>
            <Field label="保険種別">
              <select name="insurance_type" className="field" defaultValue={c?.insurance_type ?? '介護保険'}>
                {INSURANCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="被保険者番号">
              <input name="insured_number" className="field tnum" defaultValue={c?.insured_number ?? ''} />
            </Field>
            <Field label="要介護度 / 区分">
              <select name="care_level" className="field" defaultValue={c?.care_level ?? ''}>
                <option value="">未設定</option>
                {CARE_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="負担割合">
              <select name="burden_ratio" className="field" defaultValue={String(c?.burden_ratio ?? 1)}>
                <option value="1">1割</option>
                <option value="2">2割</option>
                <option value="3">3割</option>
              </select>
            </Field>
          </FormRow>

          <FormRow cols={4}>
            <Field label="認定有効期間（開始）">
              <input type="date" name="certified_from" className="field tnum" defaultValue={c?.certified_from ?? ''} />
            </Field>
            <Field label="認定有効期間（終了）" hint="期限が近づくとダッシュボードに表示されます。">
              <input type="date" name="certified_to" className="field tnum" defaultValue={c?.certified_to ?? ''} />
            </Field>
            <Field label="担当ケアマネジャー">
              <input name="care_manager" className="field" defaultValue={c?.care_manager ?? ''} />
            </Field>
            <Field label="居宅介護支援事業所">
              <input name="care_office" className="field" defaultValue={c?.care_office ?? ''} />
            </Field>
          </FormRow>
        </div>
      </Panel>

      <Panel title="緊急連絡先・留意事項" flush>
        <div className="space-y-3.5 px-4 py-3.5">
          <FormRow cols={3}>
            <Field label="氏名">
              <input name="emergency_name" className="field" defaultValue={c?.emergency_name ?? ''} />
            </Field>
            <Field label="続柄">
              <input name="emergency_relation" className="field" defaultValue={c?.emergency_relation ?? ''} placeholder="長女" />
            </Field>
            <Field label="電話番号">
              <input name="emergency_phone" className="field tnum" defaultValue={c?.emergency_phone ?? ''} />
            </Field>
          </FormRow>

          <Field label="既往歴・身体状況" hint="訪問時に必ず確認してほしいことを書きます。記録画面にも表示されます。">
            <textarea name="medical_note" className="field min-h-[4.5rem]" defaultValue={c?.medical_note ?? ''} />
          </Field>

          <Field label="備考">
            <textarea name="note" className="field min-h-[3.5rem]" defaultValue={c?.note ?? ''} />
          </Field>
        </div>
      </Panel>

      <Panel flush>
        <FormActions>
          <Link href={c ? `/clients/${c.id}` : '/clients'} className="btn btn-default">
            キャンセル
          </Link>
          <button type="submit" className="btn btn-primary px-6">
            {c ? '更新する' : '登録する'}
          </button>
        </FormActions>
      </Panel>
    </form>
  )
}
