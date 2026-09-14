import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="panel max-w-md px-6 py-7 text-center">
        <p className="tnum text-2xl font-semibold text-ink-mute">404</p>
        <h1 className="mt-1 text-lg font-semibold">ページが見つかりません</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-sub">
          URLが変わったか、対象のデータが削除された可能性があります。
        </p>
        <Link href="/" className="btn btn-primary mt-5">
          ダッシュボードへ戻る
        </Link>
      </div>
    </main>
  )
}
