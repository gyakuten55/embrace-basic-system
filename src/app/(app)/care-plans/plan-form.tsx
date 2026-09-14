import Link from 'next/link'
import { savePlan } from '@/app/actions/care-plans'
import { Field, FormActions, FormRow, Panel } from '@/components/ui'
import { PLAN_STATUS } from '@/lib/types'
import type { CarePlan, CarePlanItem, Client, ServiceCode, Staff } from '@/lib/types'
import { PlanItemsEditor } from './plan-items-editor'

export function PlanForm({
  plan,
  items,
  clients,
  staffList,
  services,
  defaultClientId,
  defaultRevision,
}: {
  plan?: CarePlan
  items: CarePlanItem[]
  clients: Client[]
  staffList: Staff[]
  services: ServiceCode[]
  defaultClientId?: number
  defaultRevision: number
}) {
  const p = plan
  const today = new Date().toLocaleDateString('sv-SE')

  return (
    <form action={savePlan} className="space-y-4">
      {p && <input type="hidden" name="id" value={p.id} />}

      <Panel title="計画書の基本情報" flush>
        <div className="space-y-3.5 px-4 py-3.5">
          <FormRow cols={4}>
            <Field label="利用者" required className="sm:col-span-2">
              <select
                name="client_id"
                className="field"
                defaultValue={String(p?.client_id ?? defaultClientId ?? '')}
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
            <Field label="版数" hint="計画を見直すたびに版を上げます。">
              <input
                type="number"
                name="revision"
                min={1}
                className="field tnum"
                defaultValue={String(p?.revision ?? defaultRevision)}
              />
            </Field>
            <Field label="作成日">
              <input type="date" name="created_on" className="field tnum" defaultValue={p?.created_on ?? today} />
            </Field>
          </FormRow>

          <FormRow cols={4}>
            <Field label="作成者">
              <select name="author_id" className="field" defaultValue={String(p?.author_id ?? '')}>
                <option value="">未設定</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}（{s.role}）
                  </option>
                ))}
              </select>
            </Field>
            <Field label="計画期間（開始）">
              <input type="date" name="period_from" className="field tnum" defaultValue={p?.period_from ?? ''} />
            </Field>
            <Field label="計画期間（終了）">
              <input type="date" name="period_to" className="field tnum" defaultValue={p?.period_to ?? ''} />
            </Field>
            <Field label="状態" hint="「同意済」にすると予定の一括作成の対象になります。">
              <select name="status" className="field" defaultValue={p?.status ?? '下書き'}>
                {PLAN_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </FormRow>
        </div>
      </Panel>

      <Panel title="意向と援助の方針" flush>
        <div className="space-y-3.5 px-4 py-3.5">
          <FormRow cols={2}>
            <Field label="利用者本人の意向">
              <textarea
                name="client_intention"
                className="field min-h-[4.5rem]"
                defaultValue={p?.client_intention ?? ''}
                placeholder="自分でできることは続けたい。お風呂に安心して入れるようにしてほしい。"
              />
            </Field>
            <Field label="家族の意向">
              <textarea
                name="family_intention"
                className="field min-h-[4.5rem]"
                defaultValue={p?.family_intention ?? ''}
              />
            </Field>
          </FormRow>

          <Field label="総合的な援助の方針">
            <textarea
              name="overall_policy"
              className="field min-h-[4rem]"
              defaultValue={p?.overall_policy ?? ''}
              placeholder="転倒に留意しながら、入浴と整容の自立度を保つ支援を行う。"
            />
          </Field>

          <FormRow cols={4}>
            <Field label="長期目標" className="sm:col-span-3">
              <input name="long_goal" className="field" defaultValue={p?.long_goal ?? ''} />
            </Field>
            <Field label="期間">
              <input name="long_goal_period" className="field" defaultValue={p?.long_goal_period ?? ''} placeholder="1年" />
            </Field>
          </FormRow>

          <FormRow cols={4}>
            <Field label="短期目標" className="sm:col-span-3">
              <input name="short_goal" className="field" defaultValue={p?.short_goal ?? ''} />
            </Field>
            <Field label="期間">
              <input name="short_goal_period" className="field" defaultValue={p?.short_goal_period ?? ''} placeholder="6か月" />
            </Field>
          </FormRow>
        </div>
      </Panel>

      <Panel title="週間サービス内容" flush>
        <PlanItemsEditor items={items} services={services} />
      </Panel>

      <Panel title="同意" flush>
        <div className="space-y-3.5 px-4 py-3.5">
          <FormRow cols={3}>
            <Field label="同意日">
              <input type="date" name="consent_on" className="field tnum" defaultValue={p?.consent_on ?? ''} />
            </Field>
            <Field label="同意者" className="sm:col-span-2">
              <input
                name="consent_name"
                className="field"
                defaultValue={p?.consent_name ?? ''}
                placeholder="田中 ハル（長女 代筆）"
              />
            </Field>
          </FormRow>
          <Field label="備考">
            <textarea name="note" className="field min-h-[3.5rem]" defaultValue={p?.note ?? ''} />
          </Field>
        </div>
      </Panel>

      <Panel flush>
        <FormActions>
          <Link href={p ? `/care-plans/${p.id}` : '/care-plans'} className="btn btn-default">
            キャンセル
          </Link>
          <button type="submit" className="btn btn-primary px-6">
            {p ? '更新する' : '登録する'}
          </button>
        </FormActions>
      </Panel>
    </form>
  )
}
