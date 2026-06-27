import { dashboardSchema, taskSchema, type DashboardData, type Task } from '@/types'
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

export async function updateTaskStatus(id: string, status: Task['Status']): Promise<Task | null> {
  if (!appsScriptUrl) {
    return null
  }

  const task = await postAppsScript<unknown>('updateTaskStatus', { id, status })
  return task ? taskSchema.parse(task) : null
}
