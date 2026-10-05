import type Database from 'better-sqlite3'
import { hashPassword } from './password'
import { addDays, dateToIso, monthDates, thisMonth, today, weekdayOf } from './date'

const DEFAULT_PASSWORD = 'embrace'

type SeedStaff = [code: string, name: string, kana: string, role: string, employment: string, qual: string, wage: number]

const STAFF: SeedStaff[] = [
  ['1001', '岩井 誠一', 'イワイ セイイチ', '管理者', '常勤', '介護福祉士', 2200],
  ['1002', '中村 由美', 'ナカムラ ユミ', 'サービス提供責任者', '常勤', '介護福祉士', 1850],
  ['1003', '藤本 香織', 'フジモト カオリ', 'サービス提供責任者', '常勤', '実務者研修', 1780],
  ['2001', '大野 千代', 'オオノ チヨ', '介護職員', '非常勤', '初任者研修', 1450],
  ['2002', '森田 静江', 'モリタ シズエ', '介護職員', '登録', '初任者研修', 1420],
  ['2003', '小林 隆', 'コバヤシ タカシ', '介護職員', '常勤', '介護福祉士', 1600],
  ['3001', '西山 恵', 'ニシヤマ メグミ', '看護職員', '非常勤', '正看護師', 2100],
]

type SeedClient = [
  code: string, name: string, kana: string, birth: string, gender: string,
  level: string, insurance: string, address: string, phone: string,
  manager: string, office: string, note: string,
]

const CLIENTS: SeedClient[] = [
  ['A-001', '田中 ハル', 'タナカ ハル', '1936-04-12', '女性', '要介護2', '介護保険', '大阪市西区北堀江1-2-3 コーポ北堀江203', '06-6531-0001', '山本 直子', 'あすなろ居宅介護支援センター', '右膝に軽度の拘縮あり。杖歩行。'],
  ['A-002', '佐藤 武', 'サトウ タケシ', '1941-09-30', '男性', '要介護3', '介護保険', '大阪市西区京町堀2-8-1', '06-6531-0002', '山本 直子', 'あすなろ居宅介護支援センター', '脳梗塞後遺症で左半身麻痺。車椅子使用。'],
  ['A-003', '鈴木 政子', 'スズキ マサコ', '1933-01-18', '女性', '要介護1', '介護保険', '大阪市西区新町3-4-5', '06-6531-0003', '川口 健', 'みなと介護支援事業所', '軽度認知症。服薬管理に見守りが必要。'],
  ['A-004', '高橋 清', 'タカハシ キヨシ', '1938-11-05', '男性', '要介護4', '介護保険', '大阪市港区弁天4-1-2', '06-6571-0004', '川口 健', 'みなと介護支援事業所', '仙骨部に褥瘡の既往。体位交換が必要。'],
  ['A-005', '伊藤 スミ', 'イトウ スミ', '1944-06-22', '女性', '要支援2', '介護保険', '大阪市西区南堀江1-9-9', '06-6531-0005', '山本 直子', 'あすなろ居宅介護支援センター', '独居。買い物と掃除の生活援助が中心。'],
  ['A-006', '渡辺 正夫', 'ワタナベ マサオ', '1940-02-14', '男性', '要介護2', '介護保険', '大阪市港区市岡2-3-7', '06-6571-0006', '藤井 恵理', 'こうべ居宅支援センター', '糖尿病。インスリン自己注射。食事の声かけ要。'],
  ['B-001', '山口 亮太', 'ヤマグチ リョウタ', '1992-07-08', '男性', '区分4', '障害福祉', '大阪市西区江戸堀1-5-2', '06-6441-0007', '—', '相談支援事業所はばたき', '知的障害。居宅介護（家事援助・身体介護）。'],
  ['B-002', '松本 千春', 'マツモト チハル', '1987-12-01', '女性', '区分3', '障害福祉', '大阪市西区靱本町2-2-8', '06-6441-0008', '—', '相談支援事業所はばたき', '身体障害（下肢）。入浴介助中心。'],
]

type SeedService = [name: string, category: string, insurance: string, minutes: number, unit: number]

const SERVICES: SeedService[] = [
  ['身体介護1（20分以上30分未満）', '身体介護', '介護保険', 30, 250],
  ['身体介護2（30分以上1時間未満）', '身体介護', '介護保険', 45, 396],
  ['身体介護3（1時間以上1時間半未満）', '身体介護', '介護保険', 60, 579],
  ['生活援助2（20分以上45分未満）', '生活援助', '介護保険', 45, 183],
  ['生活援助3（45分以上）', '生活援助', '介護保険', 60, 225],
  ['身体1生活1', '身体生活', '介護保険', 50, 317],
  ['通院等乗降介助', '通院等乗降介助', '介護保険', 30, 97],
  ['居宅介護・身体介護（30分以上1時間未満）', '身体介護', '障害福祉', 45, 402],
  ['居宅介護・家事援助（30分以上45分未満）', '生活援助', '障害福祉', 45, 151],
]

/** 曜日 → [利用者index, 職員index, サービスindex, 開始, 終了] */
const WEEKLY: Record<number, [number, number, number, string, string][]> = {
  1: [[0, 3, 1, '09:00', '09:45'], [1, 5, 2, '10:30', '11:30'], [3, 5, 2, '14:00', '15:00'], [4, 4, 3, '16:00', '16:45']],
  2: [[2, 4, 0, '09:30', '10:00'], [1, 5, 2, '10:30', '11:30'], [6, 3, 7, '13:00', '13:45'], [5, 3, 5, '15:00', '15:50']],
  3: [[0, 3, 1, '09:00', '09:45'], [3, 5, 2, '14:00', '15:00'], [7, 4, 7, '15:30', '16:15'], [4, 4, 3, '16:30', '17:15']],
  4: [[2, 4, 0, '09:30', '10:00'], [1, 5, 2, '10:30', '11:30'], [5, 3, 5, '15:00', '15:50'], [6, 3, 8, '16:00', '16:45']],
  5: [[0, 3, 1, '09:00', '09:45'], [3, 5, 2, '14:00', '15:00'], [4, 4, 4, '15:30', '16:30'], [7, 4, 7, '17:00', '17:45']],
  6: [[1, 5, 2, '10:30', '11:30'], [3, 4, 2, '14:00', '15:00']],
  0: [[3, 4, 2, '14:00', '15:00']],
}

const RECORD_SAMPLES: { note: string; condition: string; performed: string[]; bathing?: string }[] = [
  {
    note: '訪問時、居間の椅子に座って待たれていた。バイタル測定後、入浴介助を実施。浴室内は見守りにて対応し、洗身は一部介助。更衣まで問題なく終了。',
    condition: '変わりなく落ち着いて過ごされている。',
    performed: ['バイタル測定', '入浴介助', '更衣介助'],
    bathing: '実施',
  },
  {
    note: '掃除機がけと浴室の清掃を実施。洗濯物を取り込み、たたんでタンスへ収納した。買い置きの牛乳が切れていたため、次回の買い物品としてメモを残す。',
    condition: '',
    performed: ['掃除', '洗濯'],
  },
  {
    note: '体温が37.2度あり、入浴は中止し清拭で対応。本人より「少しだるい」との訴えあり。水分摂取を促し、麦茶200mlを召し上がった。ケアマネジャーへ電話で報告済み。',
    condition: '微熱とだるさの訴えあり。',
    performed: ['バイタル測定', '清拭・部分浴', '水分補給'],
    bathing: '中止',
  },
  {
    note: '排泄介助を実施。オムツ交換時、仙骨部に発赤なし。体位交換を行い、右側臥位にて終了。服薬は昼分を確認し、飲み込みまで見守った。',
    condition: '皮膚状態に変化なし。',
    performed: ['排泄介助', '体位交換', '服薬介助'],
  },
  {
    note: '昼食の調理を行い、配膳まで実施。主食副食ともに全量摂取された。食後の口腔ケアは見守りにて実施。',
    condition: '食欲良好。',
    performed: ['調理', '食事介助', '口腔ケア'],
  },
]

export function seedIfEmpty(conn: Database.Database) {
  const count = conn.prepare('SELECT COUNT(*) AS n FROM staff').get() as { n: number }
  if (count.n > 0) return

  const pw = hashPassword(DEFAULT_PASSWORD)

  conn.transaction(() => {
    conn
      .prepare(
        `INSERT INTO office (id, name, office_number, postal_code, address, phone, fax, manager)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        'エンブレイス訪問介護事業所',
        '2770100123',
        '550-0014',
        '大阪市西区北堀江1-1-1 エンブレイスビル2F',
        '06-6531-1000',
        '06-6531-1001',
        '岩井 誠一',
      )
    // 1単位の単価（大阪市＝2級地・人件費割合70%の訪問系サービス）
    conn.prepare('UPDATE office SET unit_price_care = 11.12, unit_price_disability = 11.12 WHERE id = 1').run()

    const insStaff = conn.prepare(
      `INSERT INTO staff (code, name, name_kana, role, employment, qualification, hourly_wage, phone, joined_on, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    STAFF.forEach(([code, name, kana, role, employment, qual, wage], i) =>
      insStaff.run(code, name, kana, role, employment, qual, wage, `090-0000-00${10 + i}`, '2023-04-01', pw),
    )

    const insClient = conn.prepare(
      `INSERT INTO clients (code, name, name_kana, birth_date, gender, postal_code, address, phone,
        insurance_type, insured_number, care_level, certified_from, certified_to, burden_ratio,
        care_manager, care_office, emergency_name, emergency_relation, emergency_phone,
        medical_note, status, started_on)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '利用中', ?)`,
    )
    CLIENTS.forEach(([code, name, kana, birth, gender, level, insurance, address, phone, manager, office, note], i) => {
      insClient.run(
        code, name, kana, birth, gender, '550-0000', address, phone,
        insurance, `0${1234567890 + i}`, level, '2025-04-01', '2027-03-31', 1,
        manager, office, `${name.split(' ')[0]} 洋子`, '長女', `080-1111-00${10 + i}`,
        note, '2024-06-01',
      )
    })

    const insService = conn.prepare(
      'INSERT INTO service_codes (name, category, insurance_type, minutes, unit) VALUES (?, ?, ?, ?, ?)',
    )
    SERVICES.forEach((s) => insService.run(...s))

    seedContracts(conn)
    seedPlans(conn)
    seedMeetings(conn)
    seedVisits(conn)
    seedAttendance(conn)
  })()
}

function seedContracts(conn: Database.Database) {
  const ins = conn.prepare(
    `INSERT INTO contracts (client_id, kind, insurance_type, contract_date, start_date, end_date,
      important_date, privacy_date, signer_name, signer_relation, explained_by, status, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  CLIENTS.forEach(([, name, , , , , insurance], i) => {
    const kind = insurance === '障害福祉' ? '居宅介護（障害福祉）' : '訪問介護'
    const date = `2024-0${(i % 6) + 1}-15`
    ins.run(
      i + 1, kind, insurance, date, date, null, date, date,
      `${name.split(' ')[0]} 洋子`, '長女', 2, '有効', '',
    )
  })
}

/** 利用者ごとの意向・方針・目標。週間サービス内容は WEEKLY の訪問パターンから組み立てる。 */
const PLAN_TEXT: Record<number, { intention: string; policy: string; long: string; short: string; content: string; caution: string }> = {
  0: {
    intention: '自分でできることは続けたい。お風呂に安心して入れるようにしてほしい。',
    policy: '転倒に留意しながら、入浴と整容の自立度を保つ支援を行う。',
    long: '入浴時の転倒なく、週3回の入浴を継続できる。',
    short: '浴室内の移動を見守りで行える。',
    content: '入浴介助、洗身の一部介助、更衣介助、整容',
    caution: '浴室の段差に注意し、滑り止めマットを必ず敷く。37.5度以上のときは清拭に変更する。',
  },
  1: {
    intention: '家族に負担をかけたくない。ベッドから自分で起き上がれるようになりたい。',
    policy: '左半身麻痺に配慮し、移乗動作の安全確保と褥瘡予防を最優先とする。',
    long: '褥瘡を発生させず、在宅生活を継続できる。',
    short: '移乗時の声かけで、残存機能を使った起き上がりができる。',
    content: '排泄介助、移乗介助、体位交換、清拭、服薬介助',
    caution: '移乗は必ず健側から行い、無理な引き上げをしない。仙骨部の発赤の有無を毎回確認し記録する。',
  },
  2: {
    intention: '薬を飲み忘れないようにしたい。人と話す機会がほしい。',
    policy: '服薬の確認と声かけを通じて、在宅での生活リズムを保つ。',
    long: '服薬を継続し、体調を崩さず在宅生活を送れる。',
    short: '声かけがあれば自分で服薬できる。',
    content: '服薬介助、バイタル測定、見守り・声かけ',
    caution: '飲み込みまで見守る。日付を本人と一緒に確認してから薬を取り出す。',
  },
  3: {
    intention: '床ずれをこれ以上つくりたくない。',
    policy: '体位交換と皮膚観察を確実に行い、褥瘡の再発を防ぐ。',
    long: '仙骨部の褥瘡を再発させない。',
    short: '2時間ごとの体位交換を継続できる。',
    content: '排泄介助、体位交換、清拭、口腔ケア',
    caution: '毎回、仙骨部と踵の皮膚状態を確認する。発赤があればサ責と訪問看護へ連絡する。',
  },
  4: {
    intention: '買い物と掃除だけ手伝ってほしい。あとは自分でやりたい。',
    policy: '生活援助を通じて在宅での自立生活を維持し、閉じこもりを防ぐ。',
    long: '住環境を清潔に保ち、独居生活を継続できる。',
    short: '週1回の買い物に同行し、自分で品物を選べる。',
    content: '掃除、洗濯、ゴミ出し、買い物同行',
    caution: '本人のやり方を尊重し、指示を待ってから行う。買い物の支払いは本人が行う。',
  },
  5: {
    intention: '血糖値を安定させて、長く家で暮らしたい。',
    policy: '食事と服薬の状況を確認し、糖尿病の重症化を防ぐ。',
    long: '血糖コントロールを保ち、入院せずに在宅生活を続ける。',
    short: '毎食後の血糖測定と記録を習慣にできる。',
    content: '食事介助、服薬介助、バイタル測定、調理',
    caution: 'インスリンは本人が自己注射する。実施の有無を確認し記録に残す。',
  },
  6: {
    intention: '自分の部屋をきれいにしておきたい。',
    policy: '生活の場を整えながら、できる家事を本人と一緒に行う。',
    long: '居室を清潔に保ち、落ち着いて過ごせる。',
    short: '洗濯物をたたむ作業を自分で行える。',
    content: '掃除、洗濯、調理、見守り・声かけ',
    caution: '手順は一つずつ短く伝える。急かさない。',
  },
  7: {
    intention: 'お風呂に自分のペースで入りたい。',
    policy: '下肢の状態に配慮し、安全に入浴できる環境を整える。',
    long: '転倒なく週2回の入浴を継続できる。',
    short: '浴槽への出入りを部分介助で行える。',
    content: '入浴介助、洗身の一部介助、更衣介助',
    caution: '浴槽の出入りは必ず2動作に分けて行う。シャワーチェアを使用する。',
  },
}

function seedPlans(conn: Database.Database) {
  const insPlan = conn.prepare(
    `INSERT INTO care_plans (client_id, revision, created_on, author_id, period_from, period_to,
      client_intention, family_intention, overall_policy, long_goal, long_goal_period,
      short_goal, short_goal_period, consent_on, consent_name, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const insItem = conn.prepare(
    `INSERT INTO care_plan_items (plan_id, weekday, start_time, end_time, service_code_id, content, caution, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )

  const base = today()

  CLIENTS.forEach((client, clientIdx) => {
    const text = PLAN_TEXT[clientIdx]
    if (!text) return

    // 大半は期間内。1名だけ期限間近にして、ダッシュボードの注意喚起が動くようにする。
    const soonExpiring = clientIdx === 2
    const createdOn = addDays(base, -180 + clientIdx * 3)
    const periodFrom = createdOn
    const periodTo = soonExpiring ? addDays(base, 24) : addDays(createdOn, 364)

    const res = insPlan.run(
      clientIdx + 1, 1, createdOn, clientIdx % 2 === 0 ? 2 : 3, periodFrom, periodTo,
      text.intention, '本人の意向を尊重しつつ、無理のない範囲で支援をお願いしたい。',
      text.policy, text.long, '1年', text.short, '6か月', addDays(createdOn, 3),
      `${client[1]}（長女 代筆）`, '同意済',
    )
    const planId = Number(res.lastInsertRowid)

    // 実際の訪問パターン（WEEKLY）と計画書の内容を一致させる
    const slots: [number, number, string, string][] = []
    for (const [weekday, entries] of Object.entries(WEEKLY)) {
      for (const [idx, , serviceIdx, start, end] of entries) {
        if (idx === clientIdx) slots.push([Number(weekday), serviceIdx, start, end])
      }
    }
    slots
      .sort((a, b) => (a[0] + 6) % 7 - (b[0] + 6) % 7 || a[2].localeCompare(b[2]))
      .forEach(([weekday, serviceIdx, start, end], i) =>
        insItem.run(planId, weekday, start, end, serviceIdx + 1, text.content, text.caution, i),
      )
  })
}

function seedMeetings(conn: Database.Database) {
  const insMeeting = conn.prepare(
    `INSERT INTO meetings (kind, client_id, held_on, start_time, end_time, place, chair, recorder_id,
      purpose, discussion, conclusion, todo, next_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const insAttendee = conn.prepare(
    'INSERT INTO meeting_attendees (meeting_id, name, org, role, sort_order) VALUES (?, ?, ?, ?, ?)',
  )
  const base = today()

  const m1 = insMeeting.run(
    'サービス担当者会議', 1, addDays(base, -21), '14:00', '15:00', '田中様宅', '山本 直子', 2,
    '要介護認定更新に伴うケアプラン見直しのため。',
    '入浴時のふらつきについて家族から不安の声あり。現在は見守りで対応しているが、浴室内に手すりを追加する案を検討。福祉用具事業所より、立ち上がり補助の手すりを1週間試用できると提案があった。訪問介護からは、週3回の入浴介助を継続し、体調不良時は清拭に振り替える運用を報告。',
    '浴室に手すりを1本設置する方向で調整。訪問介護は現行の週3回を継続し、次回認定までサービス内容は変更しない。',
    '福祉用具事業所が来週中に試用手すりを搬入。訪問介護は設置後の動作を1週間観察し、サ責が報告する。',
    addDays(base, 70),
  )
  ;[
    ['山本 直子', 'あすなろ居宅介護支援センター', '介護支援専門員'],
    ['中村 由美', 'エンブレイス訪問介護事業所', 'サービス提供責任者'],
    ['田中 ハル', '—', '本人'],
    ['田中 洋子', '—', '長女'],
    ['久保 健三', '福祉用具のぞみ', '福祉用具専門相談員'],
  ].forEach((a, i) => insAttendee.run(Number(m1.lastInsertRowid), a[0], a[1], a[2], i))

  const m2 = insMeeting.run(
    'サービス担当者会議', 4, addDays(base, -10), '10:00', '11:00', '高橋様宅', '川口 健', 3,
    '褥瘡の再発防止に向けた支援体制の確認。',
    '訪問看護より、仙骨部の発赤は改善傾向との報告。訪問介護の体位交換の頻度と記録内容を共有した。家族より夜間の体位交換が負担との相談があり、エアマットの導入を検討。',
    '訪問介護は体位交換を毎訪問時に実施し、皮膚状態を記録に残す。エアマットは福祉用具事業所が見積もりを提示する。',
    'サ責は記録様式に皮膚状態のチェック欄を追加する。次回までに家族へ見積もり提示。',
    addDays(base, 50),
  )
  ;[
    ['川口 健', 'みなと介護支援事業所', '介護支援専門員'],
    ['藤本 香織', 'エンブレイス訪問介護事業所', 'サービス提供責任者'],
    ['西山 恵', 'エンブレイス訪問介護事業所', '看護職員'],
    ['高橋 由紀', '—', '長男の妻'],
  ].forEach((a, i) => insAttendee.run(Number(m2.lastInsertRowid), a[0], a[1], a[2], i))

  const m3 = insMeeting.run(
    '事業所内会議', null, addDays(base, -5), '17:30', '18:30', '事業所 会議室', '岩井 誠一', 2,
    '月次のサービス提供状況の共有と、記録様式の運用確認。',
    '今月のキャンセル件数と理由を共有。体調不良によるキャンセルが前月比で増加しており、季節要因と判断。音声入力による記録作成の試行状況を報告し、入力時間が1件あたり平均で約5分短縮したとの結果を共有した。',
    '音声入力での記録作成を全ヘルパーに展開する。誤変換が出た用語は辞書に追加していく運用とする。',
    '各ヘルパーは気づいた誤変換をサ責へ報告。サ責が月末にまとめて辞書へ反映する。',
    addDays(base, 25),
  )
  ;[
    ['岩井 誠一', 'エンブレイス訪問介護事業所', '管理者'],
    ['中村 由美', 'エンブレイス訪問介護事業所', 'サービス提供責任者'],
    ['藤本 香織', 'エンブレイス訪問介護事業所', 'サービス提供責任者'],
    ['大野 千代', 'エンブレイス訪問介護事業所', '介護職員'],
    ['小林 隆', 'エンブレイス訪問介護事業所', '介護職員'],
  ].forEach((a, i) => insAttendee.run(Number(m3.lastInsertRowid), a[0], a[1], a[2], i))
}

function seedVisits(conn: Database.Database) {
  const insVisit = conn.prepare(
    `INSERT INTO visits (client_id, staff_id, service_code_id, date, plan_start, plan_end,
      actual_start, actual_end, status, cancel_reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const insRecord = conn.prepare(
    `INSERT INTO visit_records (visit_id, temperature, bp_high, bp_low, pulse, spo2, meal, water_ml,
      excretion, bathing, condition, performed, note, raw_input, ai_used, recorded_by, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )

  const now = today()
  const nowTime = new Date().toTimeString().slice(0, 5)
  // 前月・当月の2か月分を作る（実績集計の比較ができるように）
  const months = [prevMonth(thisMonth()), thisMonth()]
  let seq = 0

  for (const ym of months) {
    for (const date of monthDates(ym)) {
      const pattern = WEEKLY[weekdayOf(date)] ?? []
      for (const [clientIdx, staffIdx, serviceIdx, start, end] of pattern) {
        seq += 1
        // 当日は「終了時刻を過ぎた分だけ実施済」にして、進行中の一日を再現する
        const finished = date < now || (date === now && end <= nowTime)
        // 20件に1件ほどキャンセルを混ぜる
        const cancelled = finished && seq % 19 === 0
        const status = cancelled ? 'キャンセル' : finished ? '実施済' : '予定'
        const actualStart = status === '実施済' ? shiftTime(start, seq % 3) : ''
        const actualEnd = status === '実施済' ? shiftTime(end, seq % 2) : ''

        const res = insVisit.run(
          clientIdx + 1, staffIdx + 1, serviceIdx + 1, date, start, end,
          actualStart, actualEnd, status,
          cancelled ? ['体調不良のため中止', '入院のため', '家族対応のため'][seq % 3] : '',
        )

        if (status === '実施済') {
          const s = RECORD_SAMPLES[seq % RECORD_SAMPLES.length]
          insRecord.run(
            Number(res.lastInsertRowid),
            36 + ((seq % 12) / 10), 118 + (seq % 20), 68 + (seq % 12), 64 + (seq % 18), 96 + (seq % 4),
            seq % 3 === 0 ? '全量' : '', seq % 2 === 0 ? 150 + (seq % 4) * 50 : null,
            seq % 2 === 0 ? '排尿2回' : '排尿1回・排便あり', s.bathing ?? '',
            s.condition, JSON.stringify(s.performed), s.note, '', seq % 3 === 0 ? 1 : 0,
            staffIdx + 1, `${date} ${actualEnd || end}:00`,
          )
        }
      }
    }
  }
}

function seedAttendance(conn: Database.Database) {
  const ins = conn.prepare(
    `INSERT OR IGNORE INTO attendances (staff_id, date, kind, clock_in, clock_out, break_minutes, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
  const now = today()
  for (const ym of [prevMonth(thisMonth()), thisMonth()]) {
    for (const date of monthDates(ym)) {
      if (date > now) break
      const wd = weekdayOf(date)
      STAFF.forEach((_, i) => {
        if (wd === 0) return
        if (i >= 3 && wd === 6) return
        const kind = i >= 3 ? '直行直帰' : '出勤'
        const start = i >= 3 ? '09:00' : '08:45'
        const end = i >= 3 ? '16:30' : '17:45'
        ins.run(i + 1, date, kind, start, end, i >= 3 ? 30 : 60, '')
      })
    }
  }
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return dateToIso(new Date(y, m - 2, 1)).slice(0, 7)
}

function shiftTime(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
