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

const appsScriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined

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

function getAppsScriptUrl(action?: string) {
  if (!appsScriptUrl) return ''
  if (import.meta.env.DEV) {
    return action ? `/api/apps-script?action=${encodeURIComponent(action)}` : '/api/apps-script'
  }
  return action ? `${appsScriptUrl}?action=${encodeURIComponent(action)}` : appsScriptUrl
}

async function postAppsScript<T>(action: string, payload: Record<string, unknown>) {
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

export async function getDashboardData(): Promise<DashboardData> {
  if (!appsScriptUrl) return mockDashboardData

  const response = await fetch(getAppsScriptUrl('dashboard'), { cache: 'no-store' })
  const json = (await response.json()) as ApiResponse<unknown>
  if (!json.ok || !json.data) {
    throw new Error(json.error || 'Unable to load dashboard data')
  }

  return dashboardSchema.parse(json.data)
}

export async function createTask(data: TaskInput): Promise<Task> {
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
  if (!appsScriptUrl) {
    return null
  }

  const task = await postAppsScript<unknown>('updateTaskStatus', { id, status })
  return task ? taskSchema.parse(task) : null
}
