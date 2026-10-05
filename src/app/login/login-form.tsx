'use client'

import { useActionState } from 'react'
import { login } from '@/app/actions/session'

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null)

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="code">
          職員コード
        </label>
        <input
          id="code"
          name="code"
          className="field tnum py-2.5 text-lg"
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
          className="field py-2.5 text-lg"
          autoComplete="current-password"
          required
        />
      </div>

      {error && (
        <p className="notice border-ng/20 bg-ng-soft text-ng">{error}</p>
      )}

      <button type="submit" className="btn btn-primary btn-lg w-full" disabled={pending}>
        {pending ? 'ログイン中…' : 'ログイン'}
      </button>
    </form>
  )
}
