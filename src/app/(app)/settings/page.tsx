import { currentStaff, isAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { officeInfo } from '@/lib/queries'
import { aiEngineLabel } from '@/lib/ai'
import { changeOwnPassword } from '@/app/actions/staff'
import { deleteService, saveOffice, saveService } from '@/app/actions/settings'
import { Content, Field, FormActions, FormRow, Panel, PageHeader } from '@/components/ui'
import { ConfirmButton } from '@/components/confirm-button'
import { INSURANCE_TYPES } from '@/lib/types'
import { TERM_CORRECTIONS } from '@/lib/care-terms'
import type { ServiceCode } from '@/lib/types'

export const dynamic = 'force-dynamic'

const CATEGORIES = ['身体介護', '生活援助', '身体生活', '通院等乗降介助', 'その他']

const MESSAGES: Record<string, string> = {
  office: '事業所情報を保存しました。',
  service: 'サービス種別を保存しました。',
  'service-deleted': 'サービス種別を削除しました。',
  'service-disabled': '実績で使われているため、削除せず「無効」にしました。',
  password: 'パスワードを変更しました。',
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>
}) {
  const sp = await searchParams
  const me = await currentStaff()
  const canManage = isAdmin(me)
  const office = officeInfo()
  const services = db()
    .prepare('SELECT * FROM service_codes ORDER BY active DESC, insurance_type DESC, category, minutes')
    .all() as ServiceCode[]

  return (
    <>
      <PageHeader title="設定" sub="事業所情報、サービス種別、パスワードを管理します。" />

      <Content className="max-w-5xl space-y-4">
        {sp.saved && MESSAGES[sp.saved] && (
          <p className="rounded border border-ok/25 bg-ok-soft px-3 py-2 text-sm text-ok">
            {MESSAGES[sp.saved]}
          </p>
        )}
        {sp.error && (
          <p className="rounded border border-ng/25 bg-ng-soft px-3 py-2 text-sm text-ng">{sp.error}</p>
        )}

        <Panel title="事業所情報" flush>
          <form action={saveOffice}>
            <fieldset disabled={!canManage} className="space-y-3.5 px-4 py-3.5">
              <FormRow cols={2}>
                <Field label="事業所名">
                  <input name="name" className="field" defaultValue={office?.name ?? ''} />
                </Field>
                <Field label="事業所番号">
                  <input
                    name="office_number"
                    className="field tnum"
                    defaultValue={office?.office_number ?? ''}
                  />
                </Field>
              </FormRow>
              <FormRow cols={3}>
                <Field label="郵便番号">
                  <input name="postal_code" className="field tnum" defaultValue={office?.postal_code ?? ''} />
                </Field>
                <Field label="住所" className="sm:col-span-2">
                  <input name="address" className="field" defaultValue={office?.address ?? ''} />
                </Field>
              </FormRow>
              <FormRow cols={3}>
                <Field label="電話番号">
                  <input name="phone" className="field tnum" defaultValue={office?.phone ?? ''} />
                </Field>
                <Field label="FAX">
                  <input name="fax" className="field tnum" defaultValue={office?.fax ?? ''} />
                </Field>
                <Field label="管理者">
                  <input name="manager" className="field" defaultValue={office?.manager ?? ''} />
                </Field>
              </FormRow>
            </fieldset>
            {canManage && (
              <FormActions>
                <button type="submit" className="btn btn-primary">
                  事業所情報を保存
                </button>
              </FormActions>
            )}
          </form>
        </Panel>

        <Panel title="サービス種別" flush>
          <div id="services" className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>サービス名</th>
                  <th className="w-32">区分</th>
                  <th className="w-28">保険</th>
                  <th className="w-24 text-right">標準時間</th>
                  <th className="w-24 text-right">単位数</th>
                  <th className="w-20">状態</th>
                  <th className="w-24 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id}>
                    <td className={s.active ? '' : 'text-ink-mute line-through'}>{s.name}</td>
                    <td className="text-xs text-ink-sub">{s.category}</td>
                    <td className="text-xs text-ink-sub">{s.insurance_type}</td>
                    <td className="tnum text-right text-xs">{s.minutes}分</td>
                    <td className="tnum text-right">{s.unit}</td>
                    <td>
                      <span className={`badge ${s.active ? 'badge-ok' : 'badge-plain'}`}>
                        {s.active ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className="text-right">
                      {canManage && (
                        <form action={deleteService}>
                          <input type="hidden" name="id" value={s.id} />
                          <ConfirmButton
                            className="btn btn-quiet btn-sm text-ng"
                            message={`「${s.name}」を削除します。実績で使われている場合は削除せず無効にします。よろしいですか？`}
                          >
                            削除
                          </ConfirmButton>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canManage && (
            <form action={saveService} className="border-t border-line">
              <div className="grid grid-cols-1 gap-3 px-4 py-3.5 sm:grid-cols-6">
                <Field label="サービス名" className="sm:col-span-2">
                  <input name="name" className="field" placeholder="身体介護2（30分以上1時間未満）" required />
                </Field>
                <Field label="区分">
                  <select name="category" className="field">
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="保険種別">
                  <select name="insurance_type" className="field">
                    {INSURANCE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="標準時間(分)">
                  <input type="number" name="minutes" className="field tnum" defaultValue={30} />
                </Field>
                <Field label="単位数">
                  <input type="number" name="unit" className="field tnum" defaultValue={0} />
                </Field>
              </div>
              <FormActions>
                <button type="submit" className="btn btn-primary">
                  サービス種別を追加
                </button>
              </FormActions>
            </form>
          )}
        </Panel>

        <Panel title="AIによる記録整形">
          <dl className="dl border-t border-line-soft">
            <dt>現在の整形エンジン</dt>
            <dd>
              <span className={`badge ${aiEngineLabel() === 'Claude API' ? 'badge-ok' : 'badge-plain'}`}>
                {aiEngineLabel()}
              </span>
            </dd>
            <dt>切り替え方法</dt>
            <dd className="text-xs leading-relaxed">
              環境変数 <code className="rounded bg-line-soft px-1">ANTHROPIC_API_KEY</code> を設定すると
              Claude API で整形します。未設定でも内蔵エンジンが動くため、記録入力が止まることはありません。
            </dd>
            <dt>用語辞書</dt>
            <dd className="text-xs leading-relaxed">
              音声認識の誤変換を {TERM_CORRECTIONS.length} 組の辞書で補正しています（服役→服薬、正式→清拭 など）。
              現場でよく出る誤変換は <code className="rounded bg-line-soft px-1">src/lib/care-terms.ts</code> に
              追記して増やせます。
            </dd>
            <dt>音声入力の対応</dt>
            <dd className="text-xs leading-relaxed">
              Chrome / Edge / Android Chrome / iOS Safari で利用できます。
              対応していない環境では、文字入力とAI整形のみ使えます。
            </dd>
          </dl>
        </Panel>

        <Panel title="自分のパスワードを変更" flush>
          <form action={changeOwnPassword}>
            <div className="space-y-3.5 px-4 py-3.5">
              <FormRow cols={3}>
                <Field label="現在のパスワード">
                  <input type="password" name="current_password" className="field" autoComplete="current-password" required />
                </Field>
                <Field label="新しいパスワード" hint="6文字以上">
                  <input type="password" name="new_password" className="field" autoComplete="new-password" required />
                </Field>
                <Field label="新しいパスワード（確認）">
                  <input type="password" name="confirm_password" className="field" autoComplete="new-password" required />
                </Field>
              </FormRow>
            </div>
            <FormActions>
              <button type="submit" className="btn btn-primary">
                パスワードを変更
              </button>
            </FormActions>
          </form>
        </Panel>
      </Content>
    </>
  )
}
