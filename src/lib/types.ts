export type Staff = {
  id: number
  code: string
  name: string
  name_kana: string
  role: string
  employment: string
  qualification: string
  hourly_wage: number
  phone: string
  joined_on: string | null
  active: number
}

export type Client = {
  id: number
  code: string
  name: string
  name_kana: string
  birth_date: string | null
  gender: string
  postal_code: string
  address: string
  phone: string
  insurance_type: string
  insured_number: string
  care_level: string
  certified_from: string | null
  certified_to: string | null
  burden_ratio: number
  care_manager: string
  care_office: string
  emergency_name: string
  emergency_relation: string
  emergency_phone: string
  medical_note: string
  status: string
  started_on: string | null
  ended_on: string | null
  note: string
}

export type ServiceCode = {
  id: number
  name: string
  category: string
  insurance_type: string
  minutes: number
  unit: number
  active: number
}

export type Contract = {
  id: number
  client_id: number
  kind: string
  insurance_type: string
  contract_date: string | null
  start_date: string | null
  end_date: string | null
  important_date: string | null
  privacy_date: string | null
  signer_name: string
  signer_relation: string
  explained_by: number | null
  monthly_fee: number
  status: string
  note: string
}

export type Meeting = {
  id: number
  kind: string
  client_id: number | null
  held_on: string
  start_time: string
  end_time: string
  place: string
  chair: string
  recorder_id: number | null
  purpose: string
  discussion: string
  conclusion: string
  todo: string
  next_date: string | null
}

export type MeetingAttendee = {
  id: number
  meeting_id: number
  name: string
  org: string
  role: string
  sort_order: number
}

export type CarePlan = {
  id: number
  client_id: number
  revision: number
  created_on: string
  author_id: number | null
  period_from: string | null
  period_to: string | null
  client_intention: string
  family_intention: string
  overall_policy: string
  long_goal: string
  long_goal_period: string
  short_goal: string
  short_goal_period: string
  consent_on: string | null
  consent_name: string
  status: string
  note: string
}

export type CarePlanItem = {
  id: number
  plan_id: number
  weekday: number | null
  start_time: string
  end_time: string
  service_code_id: number | null
  content: string
  caution: string
  sort_order: number
}

export type Visit = {
  id: number
  client_id: number
  staff_id: number | null
  service_code_id: number | null
  date: string
  plan_start: string
  plan_end: string
  actual_start: string
  actual_end: string
  status: string
  cancel_reason: string
  plan_item_id: number | null
}

export type VisitRecord = {
  id: number
  visit_id: number
  temperature: number | null
  bp_high: number | null
  bp_low: number | null
  pulse: number | null
  spo2: number | null
  meal: string
  water_ml: number | null
  excretion: string
  bathing: string
  condition: string
  performed: string
  note: string
  raw_input: string
  ai_used: number
  recorded_by: number | null
  recorded_at: string | null
}

export type Attendance = {
  id: number
  staff_id: number
  date: string
  kind: string
  clock_in: string
  clock_out: string
  break_minutes: number
  note: string
}

export const VISIT_STATUS = ['予定', '実施済', 'キャンセル'] as const
export const CLIENT_STATUS = ['利用中', '休止中', '終了'] as const
export const CONTRACT_STATUS = ['有効', '更新待ち', '終了'] as const
export const PLAN_STATUS = ['下書き', '同意済', '終了'] as const
export const MEETING_KINDS = [
  'サービス担当者会議',
  '事業所内会議',
  '研修・勉強会',
  '苦情・事故対応会議',
] as const
export const INSURANCE_TYPES = ['介護保険', '障害福祉', '自費'] as const
export const CARE_LEVELS = [
  '要支援1', '要支援2',
  '要介護1', '要介護2', '要介護3', '要介護4', '要介護5',
  '区分1', '区分2', '区分3', '区分4', '区分5', '区分6',
  '自立',
] as const
export const STAFF_ROLES = [
  '管理者',
  'サービス提供責任者',
  '介護職員',
  '看護職員',
  '事務',
] as const
export const EMPLOYMENT_TYPES = ['常勤', '非常勤', '登録'] as const
export const ATTENDANCE_KINDS = ['出勤', '直行直帰', '有給', '欠勤', '休日'] as const
export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const
