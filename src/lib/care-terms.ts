/**
 * 音声入力で頻出する介護用語の誤変換辞書。
 * 誤認識されやすく、かつ置換しても他の意味にならない組み合わせだけを収録する。
 * 現場ごとの言い回しはここに追記して育てる想定。
 */
export const TERM_CORRECTIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/服役(介助|確認|支援)?/g, '服薬$1'],
  [/福役/g, '服薬'],
  [/正式(介助|を実施|で対応|のみ)/g, '清拭$1'],
  [/委譲(介助|動作)/g, '移乗$1'],
  [/異常介助/g, '移乗介助'],
  [/航空(ケア|清拭|内)/g, '口腔$1'],
  [/公国ケア/g, '口腔ケア'],
  [/体交(?!通)/g, '体位交換'],
  [/胎位交換/g, '体位交換'],
  [/単座位|短座位/g, '端座位'],
  [/長座異/g, '長座位'],
  [/画床/g, '臥床'],
  [/側が床/g, '側臥位'],
  [/食草(部|が|の|に)?/g, '褥瘡$1'],
  [/褥創/g, '褥瘡'],
  [/硬縮|甲縮/g, '拘縮'],
  [/印譜洗浄|陰部洗剤/g, '陰部洗浄'],
  [/尿取りパット/g, '尿取りパッド'],
  [/お無つ|おむつ交換/g, 'オムツ交換'],
  [/行為介助/g, '更衣介助'],
  [/背せつ|排せつ/g, '排泄'],
  [/ハイセツ/g, '排泄'],
  [/ケアマネージャー|ケアマネジャー|ケアマネさん/g, 'ケアマネジャー'],
  [/訪問回護|訪問会議/g, '訪問介護'],
  [/回護(保険|記録|計画|職員)/g, '介護$1'],
  [/デーサービス|ディサービス/g, 'デイサービス'],
  [/ショートスティ/g, 'ショートステイ'],
  [/住宅療養|自宅療養管理/g, '居宅療養管理'],
  [/サチュレーション|サチレーション/g, 'SpO2'],
  [/見守り声かけ/g, '見守り・声かけ'],
]

export function correctTerms(text: string): { text: string; corrections: { from: string; to: string }[] } {
  const corrections: { from: string; to: string }[] = []
  let out = text
  for (const [pattern, replacement] of TERM_CORRECTIONS) {
    out = out.replace(pattern, (match, ...groups) => {
      const fixed = replacement.replace(/\$(\d)/g, (_, n) => String(groups[Number(n) - 1] ?? ''))
      if (fixed !== match) corrections.push({ from: match, to: fixed })
      return fixed
    })
  }
  return { text: out, corrections }
}
/** 訪問介護で記録に残す実施項目。チェックボックスと音声抽出の両方で使う。 */
export const SERVICE_TASKS: { group: string; items: { label: string; keywords: string[] }[] }[] = [
  {
    group: '身体介護',
    items: [
      { label: '排泄介助', keywords: ['排泄', 'トイレ', 'オムツ', 'パッド', 'ポータブル'] },
      { label: '食事介助', keywords: ['食事介助', '食事の介助', '配膳', '食べて'] },
      { label: '入浴介助', keywords: ['入浴', 'お風呂', '浴槽', 'シャワー'] },
      { label: '清拭・部分浴', keywords: ['清拭', '足浴', '手浴', '陰部洗浄'] },
      { label: '更衣介助', keywords: ['更衣', '着替え', '衣類の交換'] },
      { label: '整容', keywords: ['整容', '整髪', '爪', '髭', 'ひげ'] },
      { label: '口腔ケア', keywords: ['口腔', '歯磨き', '義歯', '入れ歯', 'うがい'] },
      { label: '体位交換', keywords: ['体位交換', '体位変換'] },
      { label: '移乗・移動介助', keywords: ['移乗', '移動介助', '車椅子', '車いす', '歩行介助'] },
      { label: '起床・就寝介助', keywords: ['起床', '就寝', '離床', '臥床'] },
      { label: '服薬介助', keywords: ['服薬', '内服', '薬を'] },
      { label: '通院等介助', keywords: ['通院', '受診', '病院へ'] },
    ],
  },
  {
    group: '生活援助',
    items: [
      { label: '掃除', keywords: ['掃除', '掃除機', '拭き掃除'] },
      { label: '洗濯', keywords: ['洗濯', '干し', '取り込み', 'たたみ'] },
      { label: '調理', keywords: ['調理', '昼食を作', '夕食を作', '食事の準備', '味噌汁'] },
      { label: '買い物', keywords: ['買い物', '買物', 'スーパー'] },
      { label: 'ゴミ出し', keywords: ['ゴミ', 'ごみ'] },
      { label: 'ベッドメイク', keywords: ['ベッドメイク', 'シーツ', '布団'] },
      { label: '薬の受け取り', keywords: ['薬の受け取り', '処方', '調剤'] },
    ],
  },
  {
    group: 'その他',
    items: [
      { label: 'バイタル測定', keywords: ['体温', '血圧', '脈', 'SpO2', 'バイタル'] },
      { label: '見守り・声かけ', keywords: ['見守り', '声かけ', '傾聴'] },
      { label: '水分補給', keywords: ['水分', 'お茶', '麦茶', '飲んで'] },
    ],
  },
]
export const ALL_TASK_LABELS = SERVICE_TASKS.flatMap((g) => g.items.map((i) => i.label))
