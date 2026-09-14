import 'server-only'
import { correctTerms, ALL_TASK_LABELS, SERVICE_TASKS } from './care-terms'

export type RecordDraft = {
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
  engine: 'claude' | '内蔵エンジン'
}

const KANSUJI: Record<string, string> = {
  〇: '0', 零: '0', 一: '1', 二: '2', 三: '3', 四: '4',
  五: '5', 六: '6', 七: '7', 八: '8', 九: '9',
}

/** 全角数字・漢数字・話し言葉の数値表現を半角数字に寄せる */
function normalizeNumbers(text: string): string {
  let out = text.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
  out = out.replace(/[〇零一二三四五六七八九]/g, (c) => KANSUJI[c] ?? c)
  out = out.replace(/(\d+)十(\d)/g, (_, a, b) => `${a}${b}`)
  out = out.replace(/十(\d)/g, (_, b) => `1${b}`)
  out = out.replace(/(\d+)百(\d+)/g, (_, a, b) => `${a}${String(b).padStart(2, '0')}`)
  return out
}

function num(value: string | undefined): number | null {
  if (value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function inRange(n: number | null, min: number, max: number): number | null {
  return n !== null && n >= min && n <= max ? n : null
}

/** 音声の文字起こしからバイタル・実施内容を抜き出す（APIキー不要） */
export function extractDraft(rawInput: string): RecordDraft {
  const { text, corrections } = correctTerms(rawInput)
  const flat = normalizeNumbers(text)

  // 体温: 「36度5分」「36.5度」「熱36.5」
  let temperature: number | null = null
  const t1 = /(?:体温|熱)[^0-9]{0,6}(\d{2})(?:[.．度](\d))?/.exec(flat)
  const t2 = /(\d{2})[.．](\d)\s*度/.exec(flat)
  const t3 = /(\d{2})\s*度\s*(\d)\s*分/.exec(flat)
  if (t3) temperature = num(`${t3[1]}.${t3[2]}`)
  else if (t1) temperature = num(t1[2] ? `${t1[1]}.${t1[2]}` : t1[1])
  else if (t2) temperature = num(`${t2[1]}.${t2[2]}`)
  temperature = temperature !== null && temperature >= 33 && temperature <= 43 ? temperature : null

  // 血圧: 「128の76」「128/76」「上が128 下が76」
  let bp_high: number | null = null
  let bp_low: number | null = null
  const b1 = /(?:血圧)[^0-9]{0,8}(\d{2,3})\s*(?:の|\/|-|／|上下|,)\s*(\d{2,3})/.exec(flat)
  const b2 = /上(?:が|は)?\s*(\d{2,3})[^0-9]{0,6}下(?:が|は)?\s*(\d{2,3})/.exec(flat)
  const hit = b1 ?? b2
  if (hit) {
    bp_high = inRange(num(hit[1]), 50, 260)
    bp_low = inRange(num(hit[2]), 30, 200)
  }

  const pulse = inRange(num(/(?:脈拍|脈)[^0-9]{0,6}(\d{2,3})/.exec(flat)?.[1]), 20, 220)
  const spo2 = inRange(num(/(?:SpO2|spo2|酸素飽和度|酸素)[^0-9]{0,6}(\d{2,3})/.exec(flat)?.[1]), 50, 100)
  const water_ml = inRange(
    num(/(?:水分|お茶|麦茶|飲水)[^0-9]{0,8}(\d{2,4})\s*(?:ml|ミリ|cc|シーシー)?/.exec(flat)?.[1]),
    0,
    3000,
  )

  // 食事摂取量
  let meal = ''
  const mealAmount = /(?:食事|朝食|昼食|夕食|主食|副食)[^0-9全半]{0,10}(\d{1,2})\s*割/.exec(flat)
  if (mealAmount) meal = `${mealAmount[1]}割`
  else if (/全量(摂取|召し上|食べ)/.test(flat)) meal = '全量'
  else if (/(半分|半量)(ほど|程度)?(摂取|召し上|食べ|残)/.test(flat)) meal = '半量'
  else if (/(食事|食べ)[^。]{0,12}(拒否|されず|進まず)/.test(flat)) meal = '拒否'

  // 排泄
  const excretionParts: string[] = []
  const urine = /排尿[^0-9]{0,4}(\d{1,2})\s*回/.exec(flat)
  const stool = /排便[^0-9]{0,4}(\d{1,2})\s*回/.exec(flat)
  if (urine) excretionParts.push(`排尿${urine[1]}回`)
  else if (/排尿(あり|有り)/.test(flat)) excretionParts.push('排尿あり')
  if (stool) excretionParts.push(`排便${stool[1]}回`)
  else if (/排便(あり|有り)/.test(flat)) excretionParts.push('排便あり')
  else if (/排便(なし|無し|見られず)/.test(flat)) excretionParts.push('排便なし')
  const excretion = excretionParts.join('・')

  // 入浴
  let bathing = ''
  if (/(入浴|お風呂|浴槽)[^。]{0,20}(中止|見送|控え|やめ|できず|見合わせ)/.test(flat)) bathing = '中止'
  else if (/清拭/.test(flat)) bathing = '清拭'
  else if (/(足浴|手浴|部分浴)/.test(flat)) bathing = '部分浴'
  else if (/(入浴|お風呂|シャワー)[^。]{0,16}(実施|介助|入って|入られ|済)/.test(flat)) bathing = '実施'

  // 実施項目
  const performed = SERVICE_TASKS.flatMap((g) => g.items)
    .filter((item) => item.keywords.some((k) => flat.includes(k)))
    .map((item) => item.label)
  if (bathing === '中止') {
    const i = performed.indexOf('入浴介助')
    if (i >= 0) performed.splice(i, 1)
  }

  // 心身の状態（キャンセル・体調変化に関わる文を拾う）
  const sentences = text
    .replace(/[\r\n]+/g, '。')
    .split(/[。．\.]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const conditionSentence = sentences.find((s) =>
    /(微熱|発熱|だるい|倦怠|痛み|痛が|食欲|眠れ|不穏|ふらつき|めまい|咳|息苦|腫れ|傷|変わりなく|変化なし|落ち着)/.test(s),
  )

  return {
    note: buildNote(sentences),
    condition: conditionSentence ? `${conditionSentence}。` : '',
    temperature,
    bp_high,
    bp_low,
    pulse,
    spo2,
    water_ml,
    meal,
    excretion,
    bathing,
    performed,
    corrections,
    engine: '内蔵エンジン',
  }
}

/** 話し言葉を記録文（常体まじりの敬体）に整える */
function buildNote(sentences: string[]): string {
  return sentences
    .map((s) =>
      s
        .replace(/^(えーと|えっと|あのー|そのー|えー|あの|まあ|はい)、?\s*/g, '')
        .replace(/(だと思います|かなと思います)/g, '')
        .replace(/(っすね|っす)$/g, 'です')
        .replace(/してます/g, 'しています')
        .replace(/してた/g, 'していた')
        .replace(/ちゃった/g, 'てしまった')
        .trim(),
    )
    .filter(Boolean)
    .map((s) => (/[。！？]$/.test(s) ? s : `${s}。`))
    .join('')
}

const SYSTEM_PROMPT = `あなたは訪問介護事業所のサービス提供責任者です。
ヘルパーが音声入力した話し言葉のメモを、そのまま実地指導に出せる「サービス提供記録」の文章に整えます。

厳守事項:
- メモに書かれていない事実を足さない。推測・脚色は禁止。
- 数値（体温・血圧・脈拍・SpO2・水分量・回数）はメモの値をそのまま使う。
- 「〜した」ではなく「〜された」「〜を実施」など、記録として読める簡潔な常体で書く。
- 1〜4文、200字以内。箇条書きにはしない。
- 音声認識の誤変換と思われる介護用語は正しい表記に直す（例: 服役→服薬、正式→清拭）。
- サービスを中止・変更した場合は、その理由と代わりに行った対応を必ず残す。

出力は次のJSONのみ。前後に説明文をつけない。
{"note":"整えた記録文","condition":"心身の状態（なければ空文字）","temperature":数値かnull,"bp_high":数値かnull,"bp_low":数値かnull,"pulse":数値かnull,"spo2":数値かnull,"water_ml":数値かnull,"meal":"全量|半量|N割|拒否|空文字","excretion":"排尿2回・排便ありなど","bathing":"実施|清拭|部分浴|中止|空文字","performed":["実施項目"]}`

type ClaudeResponse = { content?: { type: string; text?: string }[] }

async function callClaude(rawInput: string, context: string): Promise<Partial<RecordDraft> | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `実施項目として選べる語: ${ALL_TASK_LABELS.join('、')}\n${context}\n\n音声メモ:\n${rawInput}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return null
    const json = (await res.json()) as ClaudeResponse
    const text = json.content?.find((c) => c.type === 'text')?.text ?? ''
    const match = /\{[\s\S]*\}/.exec(text)
    if (!match) return null
    return JSON.parse(match[0]) as Partial<RecordDraft>
  } catch {
    return null
  }
}

/**
 * 音声メモから記録の下書きを作る。
 * まず内蔵エンジンで確定的に抽出し、Claude API が使える環境ではその結果で上書きする。
 * API 障害時は内蔵エンジンの結果をそのまま返すので、記録入力が止まることはない。
 */
export async function draftRecord(rawInput: string, context = ''): Promise<RecordDraft> {
  const base = extractDraft(rawInput)
  const enhanced = await callClaude(rawInput, context)
  if (!enhanced) return base

  const pickNum = (v: unknown, fallback: number | null) =>
    typeof v === 'number' && Number.isFinite(v) ? v : fallback
  const pickStr = (v: unknown, fallback: string) =>
    typeof v === 'string' && v.trim() ? v.trim() : fallback

  return {
    ...base,
    engine: 'claude',
    note: pickStr(enhanced.note, base.note),
    condition: pickStr(enhanced.condition, base.condition),
    temperature: pickNum(enhanced.temperature, base.temperature),
    bp_high: pickNum(enhanced.bp_high, base.bp_high),
    bp_low: pickNum(enhanced.bp_low, base.bp_low),
    pulse: pickNum(enhanced.pulse, base.pulse),
    spo2: pickNum(enhanced.spo2, base.spo2),
    water_ml: pickNum(enhanced.water_ml, base.water_ml),
    meal: pickStr(enhanced.meal, base.meal),
    excretion: pickStr(enhanced.excretion, base.excretion),
    bathing: pickStr(enhanced.bathing, base.bathing),
    performed: Array.isArray(enhanced.performed)
      ? enhanced.performed.filter((p): p is string => ALL_TASK_LABELS.includes(p as string))
      : base.performed,
  }
}

export function aiEngineLabel(): string {
  return process.env.ANTHROPIC_API_KEY ? 'Claude API' : '内蔵エンジン'
}
