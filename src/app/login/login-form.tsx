'use client'

import { useActionState } from 'react'
import { login } from '@/app/actions/session'

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null)

  return (
    <form action={action} className="space-y-3.5">
      <div>
        <label className="label" htmlFor="code">
          職員コード
        </label>
        <input
          id="code"
          name="code"
          className="field tnum"
          autoComplete="username"
          inputMode="numeric"
          autoFocus
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="password">
          パスワード
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="field"
          autoComplete="current-password"
          required
        />
      </div>

      {error && (
        <p className="rounded border border-ng/25 bg-ng-soft px-2.5 py-2 text-xs text-ng">{error}</p>
      )}

      <button type="submit" className="btn btn-primary w-full py-2" disabled={pending}>
        {pending ? 'ログイン中…' : 'ログイン'}
      </button>
    </form>
  )
}
