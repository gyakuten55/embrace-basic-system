import { applyJapanTime } from './lib/timezone'

// サーバー起動時に一度だけ呼ばれる。リクエストを処理する前に日本時間へそろえる
export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') applyJapanTime()
}
