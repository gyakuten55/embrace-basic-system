import { NextResponse } from 'next/server'
import { currentStaff } from '@/lib/auth'
import { draftRecord } from '@/lib/ai'
import { visitById } from '@/lib/queries'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const staff = await currentStaff()
  if (!staff) {
    return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 })
  }

  let body: { raw?: string; visitId?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストを解釈できませんでした。' }, { status: 400 })
  }

  const raw = (body.raw ?? '').trim()
  if (!raw) {
    return NextResponse.json({ error: '音声入力の内容が空です。' }, { status: 400 })
  }
  if (raw.length > 4000) {
    return NextResponse.json({ error: '入力が長すぎます（4000文字まで）。' }, { status: 400 })
  }

  // 計画書の援助内容を渡すと、AI が文脈に沿った表現に整えやすくなる
  let context = ''
  if (body.visitId) {
    const visit = visitById(Number(body.visitId))
    if (visit) {
      const plan = db()
        .prepare(
          `SELECT i.content, i.caution FROM care_plan_items i
           JOIN care_plans p ON p.id = i.plan_id
           WHERE p.client_id = ? AND p.status = '同意済'
           ORDER BY p.revision DESC, i.sort_order LIMIT 4`,
        )
        .all(visit.client_id) as { content: string; caution: string }[]
      context = [
        `利用者: ${visit.client_name}`,
        `サービス: ${visit.service_name ?? '未設定'}`,
        plan.length ? `計画書の援助内容: ${plan.map((p) => p.content).join(' / ')}` : '',
        plan.some((p) => p.caution) ? `留意事項: ${plan.map((p) => p.caution).filter(Boolean).join(' / ')}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    }
  }

  const draft = await draftRecord(raw, context)
  return NextResponse.json(draft)
}
