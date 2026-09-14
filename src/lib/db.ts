import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { seedIfEmpty } from './seed'

let instance: Database.Database | null = null

function resolveFile() {
  const configured = process.env.DATABASE_FILE ?? './data/embrace.db'
  const file = path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  return file
}

export function db(): Database.Database {
  if (instance) return instance
  const conn = new Database(resolveFile())
  conn.pragma('journal_mode = WAL')
  conn.pragma('foreign_keys = ON')
  migrate(conn)
  seedIfEmpty(conn)
  instance = conn
  return conn
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS office (
  id                INTEGER PRIMARY KEY CHECK (id = 1),
  name              TEXT NOT NULL,
  office_number     TEXT NOT NULL DEFAULT '',
  postal_code       TEXT NOT NULL DEFAULT '',
  address           TEXT NOT NULL DEFAULT '',
  phone             TEXT NOT NULL DEFAULT '',
  fax               TEXT NOT NULL DEFAULT '',
  manager           TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS staff (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  code              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  name_kana         TEXT NOT NULL DEFAULT '',
  role              TEXT NOT NULL DEFAULT '介護職員',
  employment        TEXT NOT NULL DEFAULT '常勤',
  qualification     TEXT NOT NULL DEFAULT '',
  hourly_wage       INTEGER NOT NULL DEFAULT 0,
  phone             TEXT NOT NULL DEFAULT '',
  joined_on         TEXT,
  active            INTEGER NOT NULL DEFAULT 1,
  password_hash     TEXT NOT NULL DEFAULT '',
  created_at        TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS clients (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  code              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  name_kana         TEXT NOT NULL DEFAULT '',
  birth_date        TEXT,
  gender            TEXT NOT NULL DEFAULT '',
  postal_code       TEXT NOT NULL DEFAULT '',
  address           TEXT NOT NULL DEFAULT '',
  phone             TEXT NOT NULL DEFAULT '',
  insurance_type    TEXT NOT NULL DEFAULT '介護保険',
  insured_number    TEXT NOT NULL DEFAULT '',
  care_level        TEXT NOT NULL DEFAULT '',
  certified_from    TEXT,
  certified_to      TEXT,
  burden_ratio      INTEGER NOT NULL DEFAULT 1,
  care_manager      TEXT NOT NULL DEFAULT '',
  care_office       TEXT NOT NULL DEFAULT '',
  emergency_name    TEXT NOT NULL DEFAULT '',
  emergency_relation TEXT NOT NULL DEFAULT '',
  emergency_phone   TEXT NOT NULL DEFAULT '',
  medical_note      TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT '利用中',
  started_on        TEXT,
  ended_on          TEXT,
  note              TEXT NOT NULL DEFAULT '',
  created_at        TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS service_codes (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  category          TEXT NOT NULL,
  insurance_type    TEXT NOT NULL DEFAULT '介護保険',
  minutes           INTEGER NOT NULL DEFAULT 30,
  unit              INTEGER NOT NULL DEFAULT 0,
  active            INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS contracts (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id         INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  kind              TEXT NOT NULL DEFAULT '訪問介護',
  insurance_type    TEXT NOT NULL DEFAULT '介護保険',
  contract_date     TEXT,
  start_date        TEXT,
  end_date          TEXT,
  important_date    TEXT,
  privacy_date      TEXT,
  signer_name       TEXT NOT NULL DEFAULT '',
  signer_relation   TEXT NOT NULL DEFAULT '',
  explained_by      INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  monthly_fee       INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT '有効',
  note              TEXT NOT NULL DEFAULT '',
  created_at        TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS meetings (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  kind              TEXT NOT NULL DEFAULT 'サービス担当者会議',
  client_id         INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  held_on           TEXT NOT NULL,
  start_time        TEXT NOT NULL DEFAULT '',
  end_time          TEXT NOT NULL DEFAULT '',
  place             TEXT NOT NULL DEFAULT '',
  chair             TEXT NOT NULL DEFAULT '',
  recorder_id       INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  purpose           TEXT NOT NULL DEFAULT '',
  discussion        TEXT NOT NULL DEFAULT '',
  conclusion        TEXT NOT NULL DEFAULT '',
  todo              TEXT NOT NULL DEFAULT '',
  next_date         TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS meeting_attendees (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id        INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  name              TEXT NOT NULL DEFAULT '',
  org               TEXT NOT NULL DEFAULT '',
  role              TEXT NOT NULL DEFAULT '',
  sort_order        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS care_plans (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id         INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  revision          INTEGER NOT NULL DEFAULT 1,
  created_on        TEXT NOT NULL,
  author_id         INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  period_from       TEXT,
  period_to         TEXT,
  client_intention  TEXT NOT NULL DEFAULT '',
  family_intention  TEXT NOT NULL DEFAULT '',
  overall_policy    TEXT NOT NULL DEFAULT '',
  long_goal         TEXT NOT NULL DEFAULT '',
  long_goal_period  TEXT NOT NULL DEFAULT '',
  short_goal        TEXT NOT NULL DEFAULT '',
  short_goal_period TEXT NOT NULL DEFAULT '',
  consent_on        TEXT,
  consent_name      TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT '下書き',
  note              TEXT NOT NULL DEFAULT '',
  created_at        TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS care_plan_items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id           INTEGER NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
  weekday           INTEGER,
  start_time        TEXT NOT NULL DEFAULT '',
  end_time          TEXT NOT NULL DEFAULT '',
  service_code_id   INTEGER REFERENCES service_codes(id) ON DELETE SET NULL,
  content           TEXT NOT NULL DEFAULT '',
  caution           TEXT NOT NULL DEFAULT '',
  sort_order        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS visits (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id         INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  staff_id          INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  service_code_id   INTEGER REFERENCES service_codes(id) ON DELETE SET NULL,
  date              TEXT NOT NULL,
  plan_start        TEXT NOT NULL DEFAULT '',
  plan_end          TEXT NOT NULL DEFAULT '',
  actual_start      TEXT NOT NULL DEFAULT '',
  actual_end        TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT '予定',
  cancel_reason     TEXT NOT NULL DEFAULT '',
  plan_item_id      INTEGER REFERENCES care_plan_items(id) ON DELETE SET NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS visit_records (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id          INTEGER NOT NULL UNIQUE REFERENCES visits(id) ON DELETE CASCADE,
  temperature       REAL,
  bp_high           INTEGER,
  bp_low            INTEGER,
  pulse             INTEGER,
  spo2              INTEGER,
  meal              TEXT NOT NULL DEFAULT '',
  water_ml          INTEGER,
  excretion         TEXT NOT NULL DEFAULT '',
  bathing           TEXT NOT NULL DEFAULT '',
  condition         TEXT NOT NULL DEFAULT '',
  performed         TEXT NOT NULL DEFAULT '[]',
  note              TEXT NOT NULL DEFAULT '',
  raw_input         TEXT NOT NULL DEFAULT '',
  ai_used           INTEGER NOT NULL DEFAULT 0,
  recorded_by       INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  recorded_at       TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS attendances (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id          INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date              TEXT NOT NULL,
  kind              TEXT NOT NULL DEFAULT '出勤',
  clock_in          TEXT NOT NULL DEFAULT '',
  clock_out         TEXT NOT NULL DEFAULT '',
  break_minutes     INTEGER NOT NULL DEFAULT 0,
  note              TEXT NOT NULL DEFAULT '',
  created_at        TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  UNIQUE (staff_id, date)
);

CREATE INDEX IF NOT EXISTS idx_visits_date        ON visits(date);
CREATE INDEX IF NOT EXISTS idx_visits_client      ON visits(client_id, date);
CREATE INDEX IF NOT EXISTS idx_visits_staff       ON visits(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_contracts_client   ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_plans_client       ON care_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_meetings_held      ON meetings(held_on);
CREATE INDEX IF NOT EXISTS idx_attendance_month   ON attendances(date);
`

function migrate(conn: Database.Database) {
  conn.exec(SCHEMA)
}

export function now() {
  return new Date().toLocaleString('sv-SE').slice(0, 19)
}
