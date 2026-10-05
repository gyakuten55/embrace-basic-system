import { redirect } from 'next/navigation'
import { currentStaff } from '@/lib/auth'
import { LoginForm } from './login-form'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  if (await currentStaff()) redirect('/')

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-white">エンブレイス</h1>
          <p className="mt-1 text-sm text-white/55">介護業務システム</p>
        </div>

        <div className="rounded border border-line bg-white p-5">
          <LoginForm />
        </div>

        <p className="mt-4 text-2xs leading-5 text-white/45">
          初期データの職員コード: 1001（管理者・岩井）／ 1002（サ責・中村）／ 2001（ヘルパー・大野）
          <br />
          パスワードはいずれも embrace です。運用開始前に設定画面から変更してください。
        </p>
      </div>
    </main>
  )
}
