import { redirect } from 'next/navigation'
import { currentStaff } from '@/lib/auth'
import { LogoMark } from '@/components/icons'
import { isEphemeralDb } from '@/lib/db'
import { LoginForm } from './login-form'

export const dynamic = 'force-dynamic'

const FLOW = ['予定', '記録', '実績', '締め', '請求']

export default async function LoginPage() {
  if (await currentStaff()) redirect('/')

  return (
    <main className="grid min-h-[100dvh] bg-canvas lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* ブランド面 */}
      <section className="relative hidden overflow-hidden bg-navy px-12 py-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-accent-hi/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-sun/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <LogoMark className="h-11 w-11" />
          <span className="text-xl font-bold tracking-tight">エンブレイス</span>
        </div>

        <div className="relative my-auto max-w-md">
          <h1 className="text-3xl font-bold leading-[1.45] tracking-tight">
            記録は、話すだけ。
            <br />
            月末は、ボタンひとつ。
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/70">
            訪問介護・障害福祉の毎日の記録から月末の請求まで、
            ひとつの画面でつながる業務システムです。
          </p>

          <ol className="mt-10 flex flex-wrap items-center gap-2">
            {FLOW.map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                <span className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-semibold">
                  {step}
                </span>
                {i < FLOW.length - 1 && <span className="text-white/35">→</span>}
              </li>
            ))}
          </ol>
        </div>

        <p className="relative text-2xs text-white/40">介護業務システム</p>
      </section>

      {/* ログインフォーム */}
      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoMark className="h-11 w-11" />
            <div>
              <div className="text-xl font-bold tracking-tight">エンブレイス</div>
              <div className="text-xs text-ink-sub">介護業務システム</div>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">ログイン</h2>
          <p className="mt-1 text-sm text-ink-sub">職員コードとパスワードを入力してください。</p>

          <div className="panel mt-6 p-6">
            <LoginForm />
          </div>

          {isEphemeralDb() && (
            <p className="notice mt-5 border-sun/30 bg-sun-soft text-xs text-warn">
              お試し環境です。入力したデータは保存されず、しばらくすると初期状態に戻ります。
            </p>
          )}

          <p className="mt-5 rounded-xl border border-dashed border-line-hard px-4 py-3 text-2xs leading-5 text-ink-sub">
            初期データの職員コード: 1001（管理者・岩井）／ 1002（サ責・中村）／ 2001（ヘルパー・大野）
            <br />
            パスワードはいずれも embrace です。運用開始前に設定画面から変更してください。
          </p>
        </div>
      </section>
    </main>
  )
}
