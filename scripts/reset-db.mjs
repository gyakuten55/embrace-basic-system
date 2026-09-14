// 開発用: SQLite ファイルを削除して初期データから作り直す
import fs from 'node:fs'
import path from 'node:path'

const configured = process.env.DATABASE_FILE ?? './data/embrace.db'
const file = path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured)

let removed = 0
for (const suffix of ['', '-wal', '-shm', '-journal']) {
  const target = `${file}${suffix}`
  if (fs.existsSync(target)) {
    fs.rmSync(target)
    removed += 1
  }
}

console.log(
  removed > 0
    ? `データベースを削除しました (${file})。次回の起動時に初期データから作り直されます。`
    : `削除対象のデータベースはありませんでした (${file})。`,
)
