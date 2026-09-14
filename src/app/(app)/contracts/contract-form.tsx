import Link from 'next/link'
import { saveContract } from '@/app/actions/contracts'
import { Field, FormActions, FormRow, Panel } from '@/components/ui'
import { CONTRACT_STATUS, INSURANCE_TYPES } from '@/lib/types'
import type { Client, Contract, Staff } from '@/lib/types'

const KINDS = ['訪問介護', '介護予防訪問介護相当サービス', '居宅介護（障害福祉）', '重度訪問介護', '自費サービス']

export function ContractForm({
  contract,
  clients,
  staffList,
  defaultClientId,
  back,
}: {
  contract?: Contract
  clients: Client[]
  staffList: Staff[]
  defaultClientId?: number
  back?: string
}) {
  const c = contract
  const clientId = c?.client_id ?? defaultClientId
  return (
    <form action={saveContract} className="space-y-4">
      {c && <input type="hidden" name="id" value={c.id} />}
      {back && <input type="hidden" name="back" value={back} />}

      <Panel title="契約内容" flush>
        <div className="space-y-3.5 px-4 py-3.5">
          <FormRow cols={3}>
            <Field label="利用者" required>
              <select name="client_id" className="field" defaultValue={String(clientId ?? '')} required>
                <option value="">選択してください</option>
                {clients.map((cl) => (
                  <option key={cl.id} value={cl.id}>
                    {cl.name}（{cl.code}）
                  </option>
                ))}
              </select>
            </Field>
            <Field label="契約種別">
              <select name="kind" className="field" defaultValue={c?.kind ?? '訪問介護'}>
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="保険種別">
              <select name="insurance_type" className="field" defaultValue={c?.insurance_type ?? '介護保険'}>
                {INSURANCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          </FormRow>

          <FormRow cols={4}>
            <Field label="契約日">
              <input type="date" name="contract_date" className="field tnum" defaultValue={c?.contract_date ?? ''} />
            </Field>
            <Field label="サービス開始日">
              <input type="date" name="start_date" className="field tnum" defaultValue={c?.start_date ?? ''} />
            </Field>
            <Field label="契約終了日" hint="期限なしの場合は空欄。">
              <input type="date" name="end_date" className="field tnum" defaultValue={c?.end_date ?? ''} />
            </Field>
            <Field label="契約状態">
              <select name="status" className="field" defaultValue={c?.status ?? '有効'}>
                {CONTRACT_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </FormRow>
        </div>
      </Panel>

      <Panel title="重要事項説明・同意" flush>
        <div className="space-y-3.5 px-4 py-3.5">
          <FormRow cols={2}>
            <Field label="重要事項説明書の交付・説明日" hint="実地指導で必ず確認される項目です。">
              <input type="date" name="important_date" className="field tnum" defaultValue={c?.important_date ?? ''} />
            </Field>
            <Field label="個人情報使用同意日">
              <input type="date" name="privacy_date" className="field tnum" defaultValue={c?.privacy_date ?? ''} />
            </Field>
          </FormRow>

          <FormRow cols={3}>
            <Field label="署名者">
              <input name="signer_name" className="field" defaultValue={c?.signer_name ?? ''} />
            </Field>
            <Field label="続柄">
              <input name="signer_relation" className="field" defaultValue={c?.signer_relation ?? ''} placeholder="本人／長女 など" />
            </Field>
            <Field label="説明した職員">
              <select name="explained_by" className="field" defaultValue={String(c?.explained_by ?? '')}>
                <option value="">未設定</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </FormRow>

          <FormRow cols={2}>
            <Field label="自費サービスの月額（円）" hint="自費契約の場合のみ入力します。">
              <input type="number" name="monthly_fee" className="field tnum" defaultValue={String(c?.monthly_fee ?? 0)} />
            </Field>
          </FormRow>

          <Field label="備考">
            <textarea name="note" className="field min-h-[3.5rem]" defaultValue={c?.note ?? ''} />
          </Field>
        </div>
      </Panel>

      <Panel flush>
        <FormActions>
          <Link href={back ?? (clientId ? `/clients/${clientId}` : '/contracts')} className="btn btn-default">
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
