import fs from 'node:fs'
import { chromium } from 'playwright'

// 使い方:
//   npm i -D playwright && npx playwright install chromium
//   npm run dev                        （別のターミナルで）
//   node scripts/e2e.mjs [スクリーンショットの出力先]
//
// 環境変数 BASE_URL でアクセス先を変えられます（既定 http://localhost:3000）。
// 実行するとデータが書き込まれるため、本番のデータベースには向けないでください。
const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const SHOTS = process.argv[2] || 'e2e-screenshots'
const log = (...a) => console.log(...a)
let failures = 0

function check(label, cond, extra = '') {
  if (cond) log(`  OK   ${label}`)
  else { failures++; log(`  FAIL ${label} ${extra}`) }
}

fs.mkdirSync(SHOTS, { recursive: true })
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
)
const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 }, locale: 'ja-JP' })
const page = await ctx.newPage()
page.on('pageerror', (e) => { failures++; log('  PAGE ERROR:', e.message) })

// --- ログイン ---
log('\n[1] ログイン')
await page.goto(`${BASE}/login`)
await page.fill('#code', '1002')
await page.fill('#password', 'embrace')
await Promise.all([page.waitForURL(`${BASE}/`), page.click('button:has-text("ログイン")')])
check('ダッシュボードへ遷移', page.url() === `${BASE}/`)
check('氏名が表示される', (await page.textContent('h1')).includes('中村'))
await page.screenshot({ path: `${SHOTS}/01-dashboard.png`, fullPage: true })

// --- 利用者登録 ---
log('\n[2] 利用者の登録')
await page.goto(`${BASE}/clients/new`)
await page.fill('input[name=name]', '検証 太郎')
await page.fill('input[name=name_kana]', 'ケンショウ タロウ')
await page.fill('input[name=birth_date]', '1945-03-03')
await page.selectOption('select[name=gender]', '男性')
await page.selectOption('select[name=care_level]', '要介護2')
await page.fill('input[name=address]', '大阪市西区新町1-1-1')
await page.fill('input[name=care_manager]', '検証 ケアマネ')
await Promise.all([page.waitForURL(/\/clients\/\d+$/), page.click('button:has-text("登録する")')])
const clientUrl = page.url()
const clientId = Number(clientUrl.split('/').pop())
check('利用者詳細へ遷移', /\/clients\/\d+$/.test(clientUrl))
check('氏名が表示される', (await page.textContent('h1')).includes('検証 太郎'))

// --- 契約登録 ---
log('\n[3] 契約の登録')
await page.goto(`${BASE}/contracts/new?client=${clientId}`)
await page.fill('input[name=contract_date]', '2026-09-01')
await page.fill('input[name=start_date]', '2026-09-01')
await page.fill('input[name=important_date]', '2026-09-01')
await page.fill('input[name=privacy_date]', '2026-09-01')
await page.fill('input[name=signer_name]', '検証 花子')
await Promise.all([page.waitForURL(`${BASE}/clients/${clientId}`), page.click('button:has-text("登録する")')])
check('契約が一覧に出る', (await page.textContent('body')).includes('訪問介護'))

// --- 介護計画書 ---
log('\n[4] 介護計画書の作成（明細あり）')
await page.goto(`${BASE}/care-plans/new?client=${clientId}`)
await page.fill('input[name=period_from]', '2026-09-01')
await page.fill('input[name=period_to]', '2027-08-31')
await page.fill('textarea[name=client_intention]', '自分で歩けるようになりたい。')
await page.fill('textarea[name=overall_policy]', '転倒に留意しながら歩行機能の維持を図る。')
await page.fill('input[name=short_goal]', '室内を伝い歩きで移動できる。')
await page.selectOption('select[name=status]', '同意済')
const weekdays = page.locator('select[name=item_weekday]')
check('明細行が初期表示される', (await weekdays.count()) >= 2, `rows=${await weekdays.count()}`)
await weekdays.nth(0).selectOption('2')
await page.locator('input[name=item_start]').nth(0).fill('10:00')
await page.locator('input[name=item_end]').nth(0).fill('11:00')
await page.locator('textarea[name=item_content]').nth(0).fill('入浴介助、更衣介助')
await page.locator('textarea[name=item_caution]').nth(0).fill('37.5度以上のときは清拭に変更')
await weekdays.nth(1).selectOption('5')
await page.locator('input[name=item_start]').nth(1).fill('14:00')
await page.locator('input[name=item_end]').nth(1).fill('15:00')
await page.locator('textarea[name=item_content]').nth(1).fill('掃除、洗濯')
await Promise.all([page.waitForURL(/\/care-plans\/\d+$/), page.click('button:has-text("登録する")')])
const body4 = await page.textContent('body')
check('計画書が保存される', body4.includes('入浴介助、更衣介助') && body4.includes('掃除、洗濯'))
check('曜日が反映される', body4.includes('火') && body4.includes('金'))
await page.screenshot({ path: `${SHOTS}/02-care-plan.png`, fullPage: true })

// --- 計画書から予定を一括作成 ---
log('\n[5] 計画書から予定を一括作成')
await page.goto(`${BASE}/schedule/generate?month=2026-10`)
await page.$$eval('input[name=client_id]', (els) => els.forEach((e) => { e.checked = false }))
await page.check(`input[name=client_id][value="${clientId}"]`)
await Promise.all([page.waitForURL(/\/schedule\?/), page.click('button:has-text("予定を作成する")')])
const body5 = await page.textContent('body')
const created = /訪問予定を (\d+) 件作成/.exec(body5)
check('予定が作成される', created && Number(created[1]) > 0, body5.slice(0, 120))
log(`       作成件数: ${created ? created[1] : '?'}（2026年10月の火4回＋金5回＝9件の想定）`)
check('曜日パターンどおりの件数', created && Number(created[1]) === 9, `got ${created?.[1]}`)

// --- 記録入力 + AI整形 ---
log('\n[6] サービス記録の入力（AI整形）')
// 記録がまだ無い訪問を作ってから入力する
await page.goto(`${BASE}/schedule/new?date=2026-09-11`)
await page.selectOption('select[name=client_id]', String(clientId))
await page.selectOption('select[name=staff_id]', { index: 1 })
await page.selectOption('select[name=service_code_id]', { index: 1 })
await page.fill('input[name=plan_start]', '13:00')
await page.fill('input[name=plan_end]', '14:00')
await Promise.all([page.waitForURL(/\/schedule\?/), page.click('button:has-text("登録する")')])

await page.goto(`${BASE}/records?date=2026-09-11`)
const recordLink = page.locator('tr', { hasText: '検証 太郎' }).locator('a:has-text("記録する")').first()
check('記録リンクがある', (await recordLink.count()) > 0)
if ((await recordLink.count()) > 0) {
  await Promise.all([page.waitForURL(/\/records\/\d+$/), recordLink.click()])
  await page.fill('textarea[placeholder^="話した内容"]', 'えーと体温36度8分、血圧は132の80です。服役の確認をしてから、お風呂は微熱があるんで見送って正式で対応しました。麦茶を200ml飲まれてます。排尿2回、排便なしです。')
  await page.click('button:has-text("AIで記録を整える")')
  await page.waitForSelector('text=用語の補正', { timeout: 15000 })
  check('体温が自動入力される', (await page.inputValue('input[name=temperature]')) === '36.8')
  check('血圧(上)が自動入力される', (await page.inputValue('input[name=bp_high]')) === '132')
  check('水分量が自動入力される', (await page.inputValue('input[name=water_ml]')) === '200')
  check('入浴が「中止」になる', (await page.inputValue('select[name=bathing]')) === '中止')
  check('排泄が自動入力される', (await page.inputValue('input[name=excretion]')).includes('排尿2回'))
  const note = await page.inputValue('textarea[name=note]')
  check('特記事項が誤変換補正済み', note.includes('服薬') && note.includes('清拭'), note.slice(0, 60))
  const pressed = await page.$$eval('button[aria-pressed="true"]', (els) => els.map((e) => e.textContent))
  check('実施項目が自動選択される', pressed.includes('服薬介助') && pressed.includes('バイタル測定'), pressed.join(','))
  await page.screenshot({ path: `${SHOTS}/03-record-ai.png`, fullPage: true })
  await Promise.all([page.waitForURL(/\/records\?/), page.click('button:has-text("記録を保存する")')])
  check('保存後に一覧へ戻る', (await page.textContent('body')).includes('記録を保存しました'))
  await page.goto(`${BASE}/records?date=2026-09-11`)
  check('一覧に記録本文が出る', (await page.textContent('body')).includes('服薬'))
}

// --- 会議記録 ---
log('\n[7] 会議記録の作成')
await page.goto(`${BASE}/meetings/new?client=${clientId}`)
await page.fill('input[name=held_on]', '2026-09-10')
await page.fill('input[name=start_time]', '14:00')
await page.fill('input[name=end_time]', '15:00')
await page.fill('input[name=place]', '検証様宅')
await page.fill('input[name=chair]', '検証 ケアマネ')
await page.fill('textarea[name=purpose]', 'サービス開始にあたっての調整。')
await page.fill('textarea[name=discussion]', '訪問介護から週2回の支援内容を説明した。')
await page.fill('textarea[name=conclusion]', '週2回の訪問介護で開始する。')
await page.$$eval('input[name=attendee_name]', (els) => { els[0].value = '中村 由美'; els[0].dispatchEvent(new Event('input', { bubbles: true })) })
await page.click('button:has-text("出席者を追加")')
await page.$$eval('input[name=attendee_name]', (els) => { els[1].value = '検証 ケアマネ'; els[1].dispatchEvent(new Event('input', { bubbles: true })) })
await page.$$eval('input[name=attendee_org]', (els) => { els[1].value = '検証居宅介護支援'; els[1].dispatchEvent(new Event('input', { bubbles: true })) })
await Promise.all([page.waitForURL(/\/meetings\/\d+$/), page.click('button:has-text("登録する")')])
const body7 = await page.textContent('body')
check('会議記録が保存される', body7.includes('週2回の訪問介護で開始する'))
check('出席者が2名保存される', body7.includes('中村 由美') && body7.includes('検証 ケアマネ'))
await page.screenshot({ path: `${SHOTS}/04-meeting.png`, fullPage: true })

// --- 勤怠 ---
log('\n[8] 勤怠の一括入力')
await page.goto(`${BASE}/attendance/4?month=2026-10`)
await page.click('button:has-text("未入力の平日を既定の勤務で埋める")')
const beforeSave = await page.textContent('body')
check('実働時間が即時計算される', /実働 \d+\.\d 時間/.test(beforeSave), beforeSave.match(/実働 [^\s]+ 時間/)?.[0])
await page.click('button:has-text("この月の勤怠を保存")')
await page.waitForSelector('text=勤怠を保存しました', { timeout: 15000 }).catch(() => {})
check('保存メッセージが出る', (await page.textContent('body')).includes('勤怠を保存しました'))
await page.goto(`${BASE}/attendance?month=2026-10`)
const grid = await page.textContent('body')
check('月次グリッドに反映される', /\d+\.\d+h/.test(grid))
await page.screenshot({ path: `${SHOTS}/05-attendance.png`, fullPage: true })

// --- 実績・CSV ---
log('\n[9] 実績とCSV書き出し')
await page.goto(`${BASE}/results?month=2026-09`)
check('実績一覧が出る', (await page.textContent('body')).includes('実績・集計'))
await page.screenshot({ path: `${SHOTS}/06-results.png`, fullPage: true })
const csv = await page.request.get(`${BASE}/api/results/csv?month=2026-09`)
check('CSVが取得できる', csv.ok())
const csvText = await csv.text()
check('CSVにヘッダーがある', csvText.includes('利用者名') && csvText.includes('特記事項'))
log(`       CSV行数: ${csvText.split('\r\n').length}`)

await page.goto(`${BASE}/results/${clientId}?month=2026-09`)
await page.screenshot({ path: `${SHOTS}/07-result-sheet.png`, fullPage: true })

// --- スケジュール ---
log('\n[10] スケジュール表示')
await page.goto(`${BASE}/schedule?week=2026-09-14`)
check('週間グリッドが出る', (await page.textContent('body')).includes('スケジュール'))
await page.screenshot({ path: `${SHOTS}/08-schedule.png`, fullPage: true })
await page.goto(`${BASE}/clients/${clientId}`)
await page.screenshot({ path: `${SHOTS}/09-client.png`, fullPage: true })

// --- モバイル ---
log('\n[11] モバイル表示')
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ja-JP', storageState: await ctx.storageState() })
const mp = await mobile.newPage()
await mp.goto(`${BASE}/records`)
check('モバイルでメニューボタンが出る', (await mp.$('button[aria-label="メニューを開く"]')) !== null)
await mp.screenshot({ path: `${SHOTS}/10-mobile-records.png`, fullPage: true })
await mp.click('button[aria-label="メニューを開く"]')
await mp.waitForTimeout(300)
await mp.screenshot({ path: `${SHOTS}/11-mobile-menu.png` })
const hScroll = await mp.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
check('横スクロールが発生しない', !hScroll)

// --- 削除（確認ダイアログ） ---
log('\n[12] 削除の確認ダイアログ')
await page.goto(`${BASE}/clients/${clientId}/edit`)
let dialogMessage = ''
page.once('dialog', async (d) => { dialogMessage = d.message(); await d.dismiss() })
await page.click('button:has-text("削除する")')
await page.waitForTimeout(800)
check('確認ダイアログが出る', dialogMessage.includes('元に戻せません'), dialogMessage)
check('キャンセルすると削除されない', page.url().includes(`/clients/${clientId}/edit`))

page.once('dialog', async (d) => { await d.accept() })
await Promise.all([page.waitForURL(`${BASE}/clients`), page.click('button:has-text("削除する")')])
await page.waitForSelector('h1:has-text("利用者")', { timeout: 15000 })
check('承諾すると削除される', !(await page.textContent('table')).includes('検証 太郎'))
const gone = await page.request.get(`${BASE}/clients/${clientId}`)
check('削除後の詳細は404になる', gone.status() === 404, `status=${gone.status()}`)

// --- 月締め・請求 ---
log('\n[13] 月締め・請求')
await page.goto(`${BASE}/billing?month=2026-10`)
const openMonth = await page.textContent('body')
check('当月は予定のままの訪問が残っている', openMonth.includes('予定のまま'))
check('片づくまで締めるボタンは押せない', await page.isDisabled('button:has-text("2026年10月を締める")'))

await page.goto(`${BASE}/billing?month=2026-09`)
const preview = await page.textContent('body')
check('締め前は見込みと表示される', preview.includes('締め前'))
check('請求額が計算される', /利用者負担/.test(preview) && /\d{1,3}(,\d{3})*円/.test(preview))
await page.screenshot({ path: `${SHOTS}/12-billing-before.png`, fullPage: true })
page.once('dialog', async (d) => { await d.accept() })
await Promise.all([page.waitForURL(/saved=closed/), page.click('button:has-text("2026年9月を締める")')])
const closedBody = await page.textContent('body')
check('月を締められる', closedBody.includes('月を締めました') && closedBody.includes('締め済'))
await page.screenshot({ path: `${SHOTS}/13-billing-closed.png`, fullPage: true })

const invoiceHref = await page.getAttribute('a:has-text("請求書")', 'href')
await page.goto(`${BASE}${invoiceHref}`)
const invoice = await page.textContent('body')
check('請求書に請求額と内訳が出る', invoice.includes('ご請求額') && invoice.includes('費用総額') && !invoice.includes('見込み（締め前）'))
await page.screenshot({ path: `${SHOTS}/14-invoice.png`, fullPage: true })

const billCsv = await (await page.request.get(`${BASE}/api/billing/csv?month=2026-09`)).text()
check('請求CSVが取得できる', billCsv.includes('利用者負担額') && billCsv.includes('締め済'))

await page.goto(`${BASE}/records?date=2026-09-15`)
const recordHref = await page.getAttribute('a[href^="/records/"]', 'href')
await page.goto(`${BASE}${recordHref}`)
check('締めた月の記録は保存できない', await page.isDisabled('button:has-text("締め済みのため保存できません")'))

await page.goto(`${BASE}/billing?month=2026-09`)
page.once('dialog', async (d) => { await d.accept() })
await Promise.all([page.waitForURL(/saved=reopened/), page.click('button:has-text("締めを解除")')])
check('締めを解除できる', (await page.textContent('body')).includes('締めを解除しました'))
await page.goto(`${BASE}${recordHref}`)
check('解除後は記録を保存できる', !(await page.isDisabled('button:has-text("記録を保存する")')))

await browser.close()
log(`\n${failures === 0 ? '全て成功' : `${failures} 件の失敗`}`)
process.exit(failures === 0 ? 0 : 1)
