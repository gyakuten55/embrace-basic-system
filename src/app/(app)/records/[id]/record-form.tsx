'use client'

import { useState } from 'react'
import Link from 'next/link'
import { saveRecord } from '@/app/actions/records'
import { useSpeech } from '@/components/use-speech'
import { Icon } from '@/components/icons'
import { Field, FormActions, FormRow, Panel } from '@/components/ui'
import { SERVICE_TASKS } from '@/lib/care-terms'
import type { VisitRow } from '@/lib/queries'

type Draft = {
  note: string
  condition: string
  temperature: number | null
  bp_high: number | null
  bp_low: number | null
  pulse: number | null
  spo2: number | null
  water_ml: number | null
  meal: string
  excretion: string
  bathing: string
  performed: string[]
  corrections: { from: string; to: string }[]
  engine: string
}

export type RecordInitial = {
  temperature: string
  bp_high: string
  bp_low: string
  pulse: string
  spo2: string
  meal: string
  water_ml: string
  excretion: string
  bathing: string
  condition: string
  note: string
  raw_input: string
  performed: string[]
  ai_used: boolean
}

const MEAL_OPTIONS = ['', '全量', '8割', '半量', '少量', '拒否', '対象外']
const BATH_OPTIONS = ['', '実施', '清拭', '部分浴', '中止']

export function RecordForm({ visit, initial }: { visit: VisitRow; initial: RecordInitial }) {
  const [status, setStatus] = useState(visit.status === 'キャンセル' ? 'キャンセル' : '実施済')
  const [cancelReason, setCancelReason] = useState(visit.cancel_reason)
  const [actualStart, setActualStart] = useState(visit.actual_start || visit.plan_start)
  const [actualEnd, setActualEnd] = useState(visit.actual_end || visit.plan_end)

  const [raw, setRaw] = useState(initial.raw_input)
  const [values, setValues] = useState(initial)
  const [performed, setPerformed] = useState<string[]>(initial.performed)
  const [corrections, setCorrections] = useState<{ from: string; to: string }[]>([])
  const [engine, setEngine] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiUsed, setAiUsed] = useState(initial.ai_used)

  const speech = useSpeech((text) => setRaw((prev) => (prev ? `${prev}${text}` : text)))

  const set = (key: keyof RecordInitial, value: string) =>
    setValues((v) => ({ ...v, [key]: value }))

  const toggleTask = (label: string) =>
    setPerformed((list) => (list.includes(label) ? list.filter((l) => l !== label) : [...list, label]))

  async function runAi() {
    if (!raw.trim()) {
      setAiError('先に音声入力またはメモの入力を行ってください。')
      return
    }
    setWorking(true)
    setAiError(null)
    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ raw, visitId: visit.id }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        setAiError(body.error ?? '記録の作成に失敗しました。')
        return
      }
      const draft = (await res.json()) as Draft
      setValues((v) => ({
        ...v,
        note: draft.note || v.note,
        condition: draft.condition || v.condition,
        temperature: draft.temperature?.toString() ?? v.temperature,
        bp_high: draft.bp_high?.toString() ?? v.bp_high,
        bp_low: draft.bp_low?.toString() ?? v.bp_low,
        pulse: draft.pulse?.toString() ?? v.pulse,
        spo2: draft.spo2?.toString() ?? v.spo2,
        water_ml: draft.water_ml?.toString() ?? v.water_ml,
        meal: draft.meal || v.meal,
        excretion: draft.excretion || v.excretion,
        bathing: draft.bathing || v.bathing,
      }))
      if (draft.performed.length > 0) {
        setPerformed((list) => Array.from(new Set([...list, ...draft.performed])))
      }
      setCorrections(draft.corrections)
      setEngine(draft.engine)
      setAiUsed(true)
    } catch {
      setAiError('通信に失敗しました。電波の良い場所で再度お試しください。')
    } finally {
      setWorking(false)
    }
  }

  const cancelled = status === 'キャンセル'

  return (
    <form action={saveRecord} className="space-y-4">
      <input type="hidden" name="visit_id" value={visit.id} />
      <input type="hidden" name="date" value={visit.date} />
      <input type="hidden" name="raw_input" value={raw} />
      <input type="hidden" name="ai_used" value={aiUsed ? '1' : '0'} />
      {performed.map((p) => (
        <input key={p} type="hidden" name="performed" value={p} />
      ))}

      {/* 実施状況 */}
      <Panel title="実施状況" flush>
        <div className="space-y-3.5 px-4 py-3.5">
          <div className="flex flex-wrap gap-2">
            {['実施済', 'キャンセル'].map((s) => (
              <label
                key={s}
                className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm transition-colors ${
                  status === s
                    ? s === '実施済'
                      ? 'border-ok bg-ok-soft font-medium text-ok'
                      : 'border-ng bg-ng-soft font-medium text-ng'
                    : 'border-line-hard bg-white text-ink-sub hover:bg-line-soft'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value={s}
                  checked={status === s}
                  onChange={() => setStatus(s)}
                  className="sr-only"
                />
                {s}
              </label>
            ))}
          </div>

          {cancelled ? (
            <Field label="キャンセル理由" required hint="実績としてケアマネジャーへ返す際の根拠になります。">
              <input
                name="cancel_reason"
                className="field"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="例）37.8度の発熱があり、ご本人の希望で中止"
                required
              />
            </Field>
          ) : (
            <FormRow cols={3}>
              <Field label="実績 開始時刻">
                <input
                  type="time"
                  name="actual_start"
                  className="field tnum"
                  value={actualStart}
                  onChange={(e) => setActualStart(e.target.value)}
                />
              </Field>
              <Field label="実績 終了時刻">
                <input
                  type="time"
                  name="actual_end"
                  className="field tnum"
                  value={actualEnd}
                  onChange={(e) => setActualEnd(e.target.value)}
                />
              </Field>
              <div className="flex items-end">
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => {
                    setActualStart(visit.plan_start)
                    setActualEnd(visit.plan_end)
                  }}
                >
                  予定どおりにする
                </button>
              </div>
            </FormRow>
          )}
        </div>
      </Panel>

      {!cancelled && (
        <>
          {/* 音声入力 */}
          <Panel
            title="音声で記録を入力"
            flush
            actions={
              engine && <span className="badge badge-accent">整形: {engine}</span>
            }
          >
            <div className="space-y-3 px-4 py-3.5">
              <div className="flex flex-wrap items-center gap-2">
                {speech.listening ? (
                  <button type="button" className="btn btn-danger" onClick={speech.stop}>
                    <span className="mr-0.5 inline-block h-2 w-2 animate-pulse rounded-full bg-ng" />
                    録音を止める
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={speech.start}
                    disabled={!speech.supported}
                  >
                    <Icon.mic className="h-4 w-4" />
                    話して入力する
                  </button>
                )}
                <button type="button" className="btn btn-default" onClick={runAi} disabled={working}>
                  {working ? '整形中…' : 'AIで記録を整える'}
                </button>
                {raw && (
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    onClick={() => {
                      setRaw('')
                      setCorrections([])
                      setEngine(null)
                    }}
                  >
                    クリア
                  </button>
                )}
              </div>

              {!speech.supported && (
                <p className="text-2xs text-ink-mute">
                  このブラウザは音声入力に対応していません。下の欄に直接入力しても、AI整形は利用できます。
                </p>
              )}
              {speech.error && (
                <p className="rounded border border-warn/25 bg-warn-soft px-2.5 py-1.5 text-xs text-warn">
                  {speech.error}
                </p>
              )}

              <textarea
                className="field min-h-[6.5rem]"
                value={raw + (speech.interim ? `　${speech.interim}` : '')}
                onChange={(e) => setRaw(e.target.value)}
                placeholder="例）体温36度5分、血圧128の76。お風呂は微熱があるので見送って清拭で対応しました。麦茶を200ml飲まれています。"
              />
              <p className="hint">
                話した内容はそのまま残ります。「AIで記録を整える」を押すと、バイタルや実施項目を自動で振り分け、
                特記事項を記録用の文章に整えます。整えた後も自由に手直しできます。
              </p>

              {corrections.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 border-t border-line-soft pt-3">
                  <span className="text-2xs text-ink-sub">用語の補正:</span>
                  {corrections.map((c, i) => (
                    <span key={i} className="badge badge-plain tnum">
                      {c.from} → <span className="ml-0.5 font-semibold text-accent">{c.to}</span>
                    </span>
                  ))}
                </div>
              )}
              {aiError && (
                <p className="rounded border border-ng/25 bg-ng-soft px-2.5 py-1.5 text-xs text-ng">{aiError}</p>
              )}
            </div>
          </Panel>

          {/* バイタル */}
          <Panel title="バイタル・摂取状況" flush>
            <div className="space-y-3.5 px-4 py-3.5">
              <FormRow cols={4}>
                <Field label="体温 (℃)">
                  <input
                    name="temperature"
                    type="number"
                    step="0.1"
                    className="field tnum"
                    value={values.temperature}
                    onChange={(e) => set('temperature', e.target.value)}
                  />
                </Field>
                <Field label="血圧 (mmHg)">
                  <div className="flex items-center gap-1.5">
                    <input
                      name="bp_high"
                      type="number"
                      className="field tnum"
                      value={values.bp_high}
                      onChange={(e) => set('bp_high', e.target.value)}
                      aria-label="収縮期血圧"
                    />
                    <span className="text-ink-mute">/</span>
                    <input
                      name="bp_low"
                      type="number"
                      className="field tnum"
                      value={values.bp_low}
                      onChange={(e) => set('bp_low', e.target.value)}
                      aria-label="拡張期血圧"
                    />
                  </div>
                </Field>
                <Field label="脈拍 (回/分)">
                  <input
                    name="pulse"
                    type="number"
                    className="field tnum"
                    value={values.pulse}
                    onChange={(e) => set('pulse', e.target.value)}
                  />
                </Field>
                <Field label="SpO2 (%)">
                  <input
                    name="spo2"
                    type="number"
                    className="field tnum"
                    value={values.spo2}
                    onChange={(e) => set('spo2', e.target.value)}
                  />
                </Field>
              </FormRow>

              <FormRow cols={4}>
                <Field label="食事摂取">
                  <select
                    name="meal"
                    className="field"
                    value={values.meal}
                    onChange={(e) => set('meal', e.target.value)}
                  >
                    {MEAL_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m || '—'}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="水分摂取 (ml)">
                  <input
                    name="water_ml"
                    type="number"
                    className="field tnum"
                    value={values.water_ml}
                    onChange={(e) => set('water_ml', e.target.value)}
                  />
                </Field>
                <Field label="排泄">
                  <input
                    name="excretion"
                    className="field"
                    value={values.excretion}
                    onChange={(e) => set('excretion', e.target.value)}
                    placeholder="排尿2回・排便あり"
                  />
                </Field>
                <Field label="入浴">
                  <select
                    name="bathing"
                    className="field"
                    value={values.bathing}
                    onChange={(e) => set('bathing', e.target.value)}
                  >
                    {BATH_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b || '—'}
                      </option>
                    ))}
                  </select>
                </Field>
              </FormRow>
            </div>
          </Panel>

          {/* 実施内容 */}
          <Panel
            title="実施した内容"
            flush
            actions={<span className="text-2xs text-ink-sub">{performed.length} 件選択中</span>}
          >
            <div className="divide-y divide-line-soft">
              {SERVICE_TASKS.map((group) => (
                <div key={group.group} className="px-4 py-3">
                  <div className="mb-2 text-xs font-medium text-ink-sub">{group.group}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((item) => {
                      const on = performed.includes(item.label)
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => toggleTask(item.label)}
                          aria-pressed={on}
                          className={`rounded border px-2.5 py-1 text-xs transition-colors ${
                            on
                              ? 'border-accent bg-accent text-white'
                              : 'border-line-hard bg-white text-ink-sub hover:bg-line-soft'
                          }`}
                        >
                          {item.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* 記録本文 */}
          <Panel title="記録" flush>
            <div className="space-y-3.5 px-4 py-3.5">
              <Field label="心身の状態">
                <textarea
                  name="condition"
                  className="field min-h-[3.5rem]"
                  value={values.condition}
                  onChange={(e) => set('condition', e.target.value)}
                  placeholder="例）変わりなく落ち着いて過ごされている。"
                />
              </Field>
              <Field
                label="特記事項・サービス提供内容"
                hint="実地指導でそのまま確認される欄です。中止・変更した場合は理由と代替対応を必ず残してください。"
              >
                <textarea
                  name="note"
                  className="field min-h-[8rem]"
                  value={values.note}
                  onChange={(e) => set('note', e.target.value)}
                />
              </Field>
            </div>
          </Panel>
        </>
      )}

      <Panel flush>
        <FormActions>
          <Link href={`/records?date=${visit.date}`} className="btn btn-default">
            戻る
          </Link>
          <button type="submit" className="btn btn-primary px-6">
            記録を保存する
          </button>
        </FormActions>
      </Panel>
    </form>
  )
}
