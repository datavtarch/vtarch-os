import { dashboardSchema, type DashboardData } from '@/types'
import { mockDashboardData } from '@/lib/mock-data'

type ApiResponse<T> = {
  ok: boolean
  data?: T
  error?: string
}

const appsScriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined

export async function getDashboardData(): Promise<DashboardData> {
  if (!appsScriptUrl) return mockDashboardData

  const dashboardUrl = import.meta.env.DEV
    ? '/api/apps-script?action=dashboard'
    : `${appsScriptUrl}?action=dashboard`

  const response = await fetch(dashboardUrl)
  const json = (await response.json()) as ApiResponse<unknown>
  if (!json.ok || !json.data) {
    throw new Error(json.error || 'Unable to load dashboard data')
  }

  return dashboardSchema.parse(json.data)
}
