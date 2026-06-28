import {
  dashboardSchema,
  financeSchema,
  noteSchema,
  taskSchema,
  type DashboardData,
  type Task,
} from '@/types'
import { mockDashboardData } from '@/lib/mock-data'

type ApiResponse<T> = {
  ok: boolean
  data?: T
  error?: string
}

export type RuntimeConfig = {
  appName: string
  appsScriptUrl: string
}

const CONFIG_STORAGE_KEY = 'vtarch-os-config'
const envAppsScriptUrl = import.meta.env.DEV
  ? (import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined)?.trim() || ''
  : ''
const envAppName = (import.meta.env.VITE_APP_NAME as string | undefined)?.trim() || 'VTARCH OS'

type TaskInput = {
  DueAt?: string
  Note?: string
  Priority?: Task['Priority']
  Project?: string
  Source?: string
  Title: string
}

type NoteInput = {
  Content: string
  Project?: string
  Source?: string
  Tags?: string
  Type?: string
}

type FinanceInput = {
  Amount: number
  Category?: string
  Date?: string
  Description?: string
  PaymentMethod?: string
  Project?: string
  Type: DashboardData['finance'][number]['Type']
}

function normalizeAppsScriptUrl(value: string) {
  return value.trim().replace(/\/+$/, '')
}

function readStoredConfig(): Partial<RuntimeConfig> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Partial<RuntimeConfig>
  } catch {
    return {}
  }
}

export function getRuntimeConfig(): RuntimeConfig {
  const stored = readStoredConfig()
  return {
    appName: stored.appName?.trim() || envAppName,
    appsScriptUrl: normalizeAppsScriptUrl(stored.appsScriptUrl || envAppsScriptUrl),
  }
}

export function saveRuntimeConfig(config: RuntimeConfig) {
  if (typeof window === 'undefined') return
  const nextConfig: RuntimeConfig = {
    appName: config.appName.trim() || 'VTARCH OS',
    appsScriptUrl: normalizeAppsScriptUrl(config.appsScriptUrl),
  }
  window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(nextConfig))
}

export function clearRuntimeConfig() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(CONFIG_STORAGE_KEY)
}

function withAction(url: string, action?: string) {
  if (!action) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}action=${encodeURIComponent(action)}`
}

function getAppsScriptUrl(action?: string, urlOverride?: string) {
  const appsScriptUrl = normalizeAppsScriptUrl(urlOverride || getRuntimeConfig().appsScriptUrl)
  if (!appsScriptUrl) return ''
  if (import.meta.env.DEV && envAppsScriptUrl && appsScriptUrl === normalizeAppsScriptUrl(envAppsScriptUrl)) {
    return action ? `/api/apps-script?action=${encodeURIComponent(action)}` : '/api/apps-script'
  }
  return withAction(appsScriptUrl, action)
}

async function postAppsScript<T>(action: string, payload: Record<string, unknown>) {
  const appsScriptUrl = getRuntimeConfig().appsScriptUrl
  if (!appsScriptUrl) {
    throw new Error('Chưa cấu hình Apps Script URL')
  }

  const response = await fetch(getAppsScriptUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({ action, ...payload }),
  })
  const json = (await response.json()) as ApiResponse<T>
  if (!json.ok) {
    throw new Error(json.error || `Action failed: ${action}`)
  }
  return json.data
}

export async function testAppsScriptConnection(appsScriptUrl: string): Promise<DashboardData> {
  const url = normalizeAppsScriptUrl(appsScriptUrl)
  if (!url) throw new Error('Hãy dán Web App URL của Apps Script')
  if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/i.test(url)) {
    throw new Error('URL phải có dạng https://script.google.com/macros/s/.../exec')
  }

  const response = await fetch(getAppsScriptUrl('dashboard', url), { cache: 'no-store' })
  const json = (await response.json()) as ApiResponse<unknown>
  if (!json.ok || !json.data) {
    throw new Error(json.error || 'Apps Script chưa phản hồi đúng dữ liệu')
  }

  return dashboardSchema.parse(json.data)
}

export async function getDashboardData(): Promise<DashboardData> {
  const appsScriptUrl = getRuntimeConfig().appsScriptUrl
  if (!appsScriptUrl) return mockDashboardData

  const response = await fetch(getAppsScriptUrl('dashboard'), { cache: 'no-store' })
  const json = (await response.json()) as ApiResponse<unknown>
  if (!json.ok || !json.data) {
    throw new Error(json.error || 'Unable to load dashboard data')
  }

  return dashboardSchema.parse(json.data)
}

export async function createTask(data: TaskInput): Promise<Task> {
  const appsScriptUrl = getRuntimeConfig().appsScriptUrl
  if (!appsScriptUrl) {
    return taskSchema.parse({
      ID: `local-${Date.now()}`,
      Title: data.Title,
      Status: 'Inbox',
      Priority: data.Priority || 'P2',
      Project: data.Project || '',
      Tags: '',
      DueAt: data.DueAt || '',
      RemindAt: '',
      Note: data.Note || '',
      CreatedAt: new Date().toISOString(),
      DoneAt: '',
      Source: data.Source || 'Web',
    })
  }

  const task = await postAppsScript<unknown>('createTask', { data })
  return taskSchema.parse(task)
}

export async function createNote(data: NoteInput): Promise<DashboardData['notes'][number]> {
  const appsScriptUrl = getRuntimeConfig().appsScriptUrl
  if (!appsScriptUrl) {
    return noteSchema.parse({
      ID: `local-note-${Date.now()}`,
      Content: data.Content,
      Type: data.Type || 'text',
      Tags: data.Tags || '',
      Project: data.Project || '',
      LinkedTaskID: '',
      FileURL: '',
      CreatedAt: new Date().toISOString(),
      Source: data.Source || 'Web',
    })
  }

  const note = await postAppsScript<unknown>('createNote', { data })
  return noteSchema.parse(note)
}

export async function createFinance(data: FinanceInput): Promise<DashboardData['finance'][number]> {
  const appsScriptUrl = getRuntimeConfig().appsScriptUrl
  if (!appsScriptUrl) {
    return financeSchema.parse({
      ID: `local-finance-${Date.now()}`,
      Date: data.Date || new Date().toISOString().slice(0, 10),
      Type: data.Type,
      Amount: data.Amount,
      Category: data.Category || 'general',
      Description: data.Description || '',
      Project: data.Project || '',
      PaymentMethod: data.PaymentMethod || '',
      ReceiptURL: '',
      CreatedAt: new Date().toISOString(),
    })
  }

  const finance = await postAppsScript<unknown>('createFinance', { data })
  return financeSchema.parse(finance)
}

export async function updateTaskStatus(id: string, status: Task['Status']): Promise<Task | null> {
  const appsScriptUrl = getRuntimeConfig().appsScriptUrl
  if (!appsScriptUrl) {
    return null
  }

  const task = await postAppsScript<unknown>('updateTaskStatus', { id, status })
  return task ? taskSchema.parse(task) : null
}
