'use client'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="panel max-w-lg px-6 py-7">
        <h1 className="text-lg font-semibold">処理を完了できませんでした</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-sub">
          もう一度お試しください。繰り返し発生する場合は、下のメッセージを添えて管理者へご連絡ください。
        </p>
        <pre className="mt-3 overflow-x-auto rounded border border-line bg-line-soft px-3 py-2 text-xs text-ink-sub">
          {error.message}
        </pre>
        <div className="mt-5 flex gap-2">
          <button type="button" className="btn btn-primary" onClick={reset}>
            やり直す
          </button>
          <a href="/" className="btn btn-default">
            ダッシュボードへ戻る
          </a>
        </div>
      </div>
    </main>
  )
}
