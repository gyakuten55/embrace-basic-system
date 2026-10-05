/**
 * 日付・時刻はすべて日本時間で扱う。
 * Vercel などのサーバーは UTC で動くため、そのままだと朝9時前の「今日」が前日になる。
 * Node は実行中に TZ を変えると Date と SQLite の localtime の両方に反映される。
 */
export function applyJapanTime() {
  const zone = process.env.APP_TIMEZONE || 'Asia/Tokyo'
  if (process.env.TZ !== zone) process.env.TZ = zone
}
