import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  CreditCard,
  Flag,
  Folder,
  LayoutDashboard,
  Link2,
  NotebookText,
  Plus,
  RotateCcw,
  Settings,
  ShieldCheck,
  Tags,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react'
import {
  createFinance,
  createNote,
  createTask,
  clearRuntimeConfig,
  getDashboardData,
  getRuntimeConfig,
  saveRuntimeConfig,
  testAppsScriptConnection,
  updateTaskStatus,
  type RuntimeConfig,
} from '@/lib/api'
import { mockDashboardData } from '@/lib/mock-data'
import type { DashboardData, Task } from '@/types'

type ViewId = 'today' | 'tasks' | 'capture' | 'finance'
type SyncState = 'loading' | 'ready' | 'saving' | 'error'
type CaptureKind = 'task' | 'note' | 'finance'
type CapturePicker = 'idle' | 'category' | 'date' | 'financeType' | 'note' | 'priority' | 'project'
type TaskStatusFilter = 'Open' | 'All' | Task['Status']

type CaptureDraft = {
  amount: string
  category: string
  content: string
  date: string
  dueAt: string
  financeType: 'expense' | 'income'
  kind: CaptureKind
  note: string
  priority: Task['Priority']
  project: string
  title: string
}

const views: Array<{ id: ViewId; label: string; icon: LucideIcon }> = [
  { id: 'today', label: 'Hôm nay', icon: LayoutDashboard },
  { id: 'tasks', label: 'Công việc', icon: CheckCircle2 },
  { id: 'capture', label: 'Ghi nhanh', icon: NotebookText },
  { id: 'finance', label: 'Tài chính', icon: CreditCard },
]

const statusLabel: Record<Task['Status'], string> = {
  Inbox: 'Mới',
  Doing: 'Đang làm',
  Waiting: 'Đang chờ',
  Done: 'Hoàn thành',
  Cancelled: 'Đã hủy',
}

const statusTone: Record<Task['Status'], string> = {
  Inbox: 'bg-sky-400/10 text-sky-200 ring-sky-400/20',
  Doing: 'bg-amber-400/10 text-amber-200 ring-amber-400/20',
  Waiting: 'bg-violet-400/10 text-violet-200 ring-violet-400/20',
  Done: 'bg-emerald-400/10 text-emerald-200 ring-emerald-400/20',
  Cancelled: 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20',
}

const priorityTone: Record<Task['Priority'], string> = {
  P1: 'text-rose-300 bg-rose-400/10 ring-rose-400/20',
  P2: 'text-amber-300 bg-amber-400/10 ring-amber-400/20',
  P3: 'text-zinc-300 bg-zinc-500/10 ring-zinc-500/20',
}

const emptyDraft: CaptureDraft = {
  amount: '',
  category: '',
  content: '',
  date: new Date().toISOString().slice(0, 10),
  dueAt: '',
  financeType: 'expense',
  kind: 'task',
  note: '',
  priority: 'P2',
  project: '',
  title: '',
}

function formatDate(value?: string) {
  if (!value) return 'Chưa đặt'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value)
}

function isOpenTask(task: Task) {
  return !['Done', 'Cancelled'].includes(task.Status)
}

function isOverdue(task: Task) {
  return isOpenTask(task) && Boolean(task.DueAt) && new Date(task.DueAt) < new Date()
}

function sortByDueDate(tasks: Task[]) {
  return [...tasks].sort((first, second) => {
    const firstTime = first.DueAt ? new Date(first.DueAt).getTime() : Number.MAX_SAFE_INTEGER
    const secondTime = second.DueAt ? new Date(second.DueAt).getTime() : Number.MAX_SAFE_INTEGER
    return firstTime - secondTime
  })
}

function withFreshMetrics(data: DashboardData): DashboardData {
  const openTasks = data.tasks.filter(isOpenTask)
  const overdueTasks = openTasks.filter(isOverdue)
  const expense = data.finance
    .filter((item) => item.Type === 'expense')
    .reduce((sum, item) => sum + Number(item.Amount || 0), 0)

  return {
    ...data,
    metrics: {
      todayTasks: openTasks.length,
      overdueTasks: overdueTasks.length,
      weeklyExpense: expense,
      notes: data.notes.length,
    },
  }
}

function App() {
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig>(() => getRuntimeConfig())
  const [dashboard, setDashboard] = useState<DashboardData>(withFreshMetrics(mockDashboardData))
  const [source, setSource] = useState('dữ liệu mẫu')
  const [syncState, setSyncState] = useState<SyncState>('loading')
  const [syncMessage, setSyncMessage] = useState('Đang tải dữ liệu')
  const [activeView, setActiveView] = useState<ViewId>('today')
  const [selectedTaskId, setSelectedTaskId] = useState<string>(mockDashboardData.tasks[0]?.ID || '')
  const [isCaptureOpen, setIsCaptureOpen] = useState(false)
  const [isSetupOpen, setIsSetupOpen] = useState(() => !getRuntimeConfig().appsScriptUrl)
  const [busyTaskId, setBusyTaskId] = useState('')
  const [isUsingMock, setIsUsingMock] = useState(true)

  const hasRemote = Boolean(runtimeConfig.appsScriptUrl)

  useEffect(() => {
    document.title = runtimeConfig.appName || 'VTARCH OS'
  }, [runtimeConfig.appName])

  useEffect(() => {
    setSyncState('loading')
    setSyncMessage('Đang tải dữ liệu')
    getDashboardData()
      .then((data) => {
        const hasRows = Boolean(hasRemote && (data.tasks.length || data.notes.length || data.finance.length))
        const nextDashboard = withFreshMetrics(hasRows ? data : mockDashboardData)
        setDashboard(nextDashboard)
        setSelectedTaskId(nextDashboard.tasks[0]?.ID || '')
        setIsUsingMock(!hasRows)
        setSource(hasRemote ? (hasRows ? 'Google Sheets' : 'Google Sheets · dữ liệu mẫu') : 'dữ liệu mẫu')
        setSyncState('ready')
        setSyncMessage(hasRows ? 'Đã đồng bộ' : 'Đang dùng dữ liệu mẫu')
      })
      .catch((error) => {
        setDashboard(withFreshMetrics(mockDashboardData))
        setSelectedTaskId(mockDashboardData.tasks[0]?.ID || '')
        setIsUsingMock(true)
        setSource('dữ liệu mẫu')
        setSyncState('error')
        setSyncMessage(error instanceof Error ? error.message : 'Không tải được dữ liệu')
      })
  }, [hasRemote, runtimeConfig.appsScriptUrl])

  const openTasks = useMemo(() => dashboard.tasks.filter(isOpenTask), [dashboard.tasks])
  const overdueTasks = useMemo(() => openTasks.filter(isOverdue), [openTasks])
  const upcomingTasks = useMemo(() => sortByDueDate(openTasks), [openTasks])
  const selectedTask =
    dashboard.tasks.find((task) => task.ID === selectedTaskId) ||
    upcomingTasks[0] ||
    dashboard.tasks[0]
  const focusTask =
    openTasks.find((task) => task.Priority === 'P1' && task.Status !== 'Waiting') ||
    openTasks.find((task) => task.Status === 'Doing') ||
    upcomingTasks[0]

  const income = dashboard.finance
    .filter((item) => item.Type === 'income')
    .reduce((total, item) => total + item.Amount, 0)
  const expense = dashboard.finance
    .filter((item) => item.Type === 'expense')
    .reduce((total, item) => total + item.Amount, 0)
  const balance = income - expense
  const activeLabel = views.find((view) => view.id === activeView)?.label || 'Hôm nay'

  const replaceMockData = isUsingMock && hasRemote

  const handleSaveSetup = async (config: RuntimeConfig) => {
    setSyncState('loading')
    setSyncMessage('Đang kiểm tra kết nối')
    const data = await testAppsScriptConnection(config.appsScriptUrl)
    saveRuntimeConfig(config)
    const nextConfig = getRuntimeConfig()
    const hasRows = data.tasks.length || data.notes.length || data.finance.length
    const nextDashboard = withFreshMetrics(hasRows ? data : mockDashboardData)

    setRuntimeConfig(nextConfig)
    setDashboard(nextDashboard)
    setSelectedTaskId(nextDashboard.tasks[0]?.ID || '')
    setIsUsingMock(!hasRows)
    setSource(hasRows ? 'Google Sheets' : 'Google Sheets · dữ liệu mẫu')
    setSyncState('ready')
    setSyncMessage(hasRows ? 'Đã kết nối' : 'Đã kết nối, đang dùng dữ liệu mẫu')
    setIsSetupOpen(false)
  }

  const handleResetSetup = () => {
    clearRuntimeConfig()
    const nextConfig = getRuntimeConfig()
    setRuntimeConfig(nextConfig)
    setDashboard(withFreshMetrics(mockDashboardData))
    setSelectedTaskId(mockDashboardData.tasks[0]?.ID || '')
    setIsUsingMock(true)
    setSource(nextConfig.appsScriptUrl ? 'Google Sheets' : 'dữ liệu mẫu')
    setSyncState('ready')
    setSyncMessage(nextConfig.appsScriptUrl ? 'Đã quay về cấu hình mặc định' : 'Đang dùng dữ liệu mẫu')
  }

  const handleCapture = async (draft: CaptureDraft) => {
    setSyncState('saving')
    setSyncMessage('Đang lưu')

    try {
      if (draft.kind === 'task') {
        const task = await createTask({
          Title: draft.title.trim(),
          Priority: draft.priority,
          Project: draft.project.trim() || 'Personal OS',
          DueAt: draft.dueAt ? new Date(draft.dueAt).toISOString() : '',
          Note: draft.note.trim(),
          Source: 'Web',
        })

        setDashboard((current) =>
          withFreshMetrics(
            replaceMockData
              ? { ...current, finance: [], notes: [], tasks: [task] }
              : { ...current, tasks: [task, ...current.tasks.filter((item) => item.ID !== task.ID)] },
          ),
        )
        setSelectedTaskId(task.ID)
        setActiveView('tasks')
      }

      if (draft.kind === 'note') {
        const note = await createNote({
          Content: draft.content.trim(),
          Project: draft.project.trim(),
          Source: 'Web',
          Tags: draft.category.trim(),
          Type: 'text',
        })

        setDashboard((current) =>
          withFreshMetrics(
            replaceMockData
              ? { ...current, finance: [], notes: [note], tasks: [] }
              : { ...current, notes: [note, ...current.notes.filter((item) => item.ID !== note.ID)] },
          ),
        )
        setActiveView('capture')
      }

      if (draft.kind === 'finance') {
        const item = await createFinance({
          Amount: Number(draft.amount || 0),
          Category: draft.category.trim() || 'general',
          Date: draft.date || new Date().toISOString().slice(0, 10),
          Description: draft.title.trim() || draft.category.trim() || 'Giao dịch',
          Project: draft.project.trim(),
          Type: draft.financeType,
        })

        setDashboard((current) =>
          withFreshMetrics(
            replaceMockData
              ? { ...current, finance: [item], notes: [], tasks: [] }
              : { ...current, finance: [item, ...current.finance.filter((row) => row.ID !== item.ID)] },
          ),
        )
        setActiveView('finance')
      }

      setIsUsingMock(false)
      setSource(hasRemote ? 'Google Sheets' : 'dữ liệu mẫu')
      setSyncState('ready')
      setSyncMessage(hasRemote ? 'Đã lưu vào Google Sheets' : 'Đã lưu tạm')
      setIsCaptureOpen(false)
      return true
    } catch (error) {
      setSyncState('error')
      setSyncMessage(error instanceof Error ? error.message : 'Không lưu được dữ liệu')
      return false
    }
  }

  const handleTaskStatusChange = async (task: Task, status: Task['Status']) => {
    if (task.Status === status || busyTaskId) return
    if (isUsingMock && hasRemote) {
      setSyncState('error')
      setSyncMessage('Dữ liệu mẫu không thể cập nhật. Hãy tạo việc mới trước.')
      return
    }

    setBusyTaskId(task.ID)
    setSyncState('saving')
    setSyncMessage('Đang cập nhật task')
    try {
      const updatedTask = await updateTaskStatus(task.ID, status)
      const nextTask = updatedTask || {
        ...task,
        DoneAt: status === 'Done' ? new Date().toISOString() : '',
        Status: status,
      }

      setDashboard((current) =>
        withFreshMetrics({
          ...current,
          tasks: current.tasks.map((item) => (item.ID === task.ID ? nextTask : item)),
        }),
      )
      setSelectedTaskId(nextTask.ID)
      setSyncState('ready')
      setSyncMessage(hasRemote ? 'Đã cập nhật Google Sheets' : 'Đã cập nhật tạm')
    } catch (error) {
      setSyncState('error')
      setSyncMessage(error instanceof Error ? error.message : 'Không cập nhật được task')
    } finally {
      setBusyTaskId('')
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050609] text-zinc-100">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-80"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% -10%, rgba(255,255,255,0.16), transparent 32%), linear-gradient(120deg, rgba(125,211,252,0.08), transparent 38%), linear-gradient(rgba(255,255,255,0.026) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 100% 100%, 48px 48px, 48px 48px',
        }}
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[760px] flex-col">
        <Topbar
          activeLabel={activeLabel}
          appName={runtimeConfig.appName}
          onCapture={() => setIsCaptureOpen(true)}
          onSetup={() => setIsSetupOpen(true)}
          source={source}
          syncMessage={syncMessage}
          syncState={syncState}
        />

        <section className="min-h-0 flex-1 px-3 pb-28 pt-3 md:px-4 md:pb-32">
          {!hasRemote && (
            <SetupBanner onSetup={() => setIsSetupOpen(true)} />
          )}

          {activeView === 'today' && (
            <TodayView
              balance={balance}
              busyTaskId={busyTaskId}
              expense={expense}
              focusTask={focusTask}
              onCapture={() => setIsCaptureOpen(true)}
              onStatusChange={handleTaskStatusChange}
              openTasks={openTasks}
              overdueCount={overdueTasks.length}
              setActiveView={setActiveView}
              setSelectedTaskId={setSelectedTaskId}
              tasks={upcomingTasks}
            />
          )}
          {activeView === 'tasks' && (
            <TasksView
              busyTaskId={busyTaskId}
              onCapture={() => setIsCaptureOpen(true)}
              onStatusChange={handleTaskStatusChange}
              selectedTask={selectedTask}
              setSelectedTaskId={setSelectedTaskId}
              tasks={dashboard.tasks}
            />
          )}
          {activeView === 'capture' && (
            <CaptureView
              error={syncState === 'error' ? syncMessage : ''}
              isSaving={syncState === 'saving'}
              notes={dashboard.notes}
              onCreate={handleCapture}
            />
          )}
          {activeView === 'finance' && (
            <FinanceView
              balance={balance}
              expense={expense}
              finance={dashboard.finance}
              income={income}
              onCapture={() => setActiveView('capture')}
            />
          )}
        </section>
      </div>

      <button
        className="fixed bottom-[82px] right-4 z-30 grid size-14 place-items-center rounded-2xl bg-white text-zinc-950 shadow-[0_18px_48px_rgba(255,255,255,0.18)] md:left-1/2 md:right-auto md:translate-x-[306px]"
        onClick={() => setIsCaptureOpen(true)}
        type="button"
      >
        <Plus size={22} />
      </button>
      <CaptureModal
        error={syncState === 'error' ? syncMessage : ''}
        isOpen={isCaptureOpen}
        isSaving={syncState === 'saving'}
        onClose={() => setIsCaptureOpen(false)}
        onCreate={handleCapture}
      />
      <SetupModal
        config={runtimeConfig}
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onReset={handleResetSetup}
        onSave={handleSaveSetup}
      />
      <MobileNav activeView={activeView} setActiveView={setActiveView} />
    </main>
  )
}

function Topbar({
  activeLabel,
  appName,
  onCapture,
  onSetup,
  source,
  syncMessage,
  syncState,
}: {
  activeLabel: string
  appName: string
  onCapture: () => void
  onSetup: () => void
  source: string
  syncMessage: string
  syncState: SyncState
}) {
  const syncDot = {
    error: 'bg-rose-400',
    loading: 'bg-sky-300',
    ready: 'bg-emerald-400',
    saving: 'bg-amber-300',
  }[syncState]

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#050609]/78 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-2xl md:px-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{appName}</p>
          <h1 className="truncate text-2xl font-semibold text-white">{activeLabel}</h1>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <span className={`size-2 shrink-0 rounded-full ${syncDot}`} />
            <p className="truncate text-xs text-zinc-500">{source} · {syncMessage}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            className="grid size-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
            onClick={onSetup}
            aria-label="Cài đặt kết nối"
            type="button"
          >
            <Settings size={17} />
          </button>
          <button
            className="hidden size-10 place-items-center rounded-2xl bg-white text-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.22),0_18px_45px_rgba(255,255,255,0.12)] transition hover:bg-[#eefbf6] md:grid"
            onClick={onCapture}
            aria-label="Ghi nhanh"
            type="button"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}

function SetupBanner({ onSetup }: { onSetup: () => void }) {
  return (
    <section className="mb-4 flex items-center justify-between gap-3 rounded-3xl border border-amber-300/15 bg-amber-300/[0.07] p-3 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl border border-amber-200/20 bg-black/20 text-amber-200">
          <Link2 size={17} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">Chưa kết nối Google Sheet</p>
          <p className="truncate text-xs text-zinc-500">App đang chạy bằng dữ liệu mẫu.</p>
        </div>
      </div>
      <button
        className="min-h-10 shrink-0 rounded-2xl bg-white px-4 text-sm font-semibold text-zinc-950"
        onClick={onSetup}
        type="button"
      >
        Kết nối
      </button>
    </section>
  )
}

function SetupModal({
  config,
  isOpen,
  onClose,
  onReset,
  onSave,
}: {
  config: RuntimeConfig
  isOpen: boolean
  onClose: () => void
  onReset: () => void
  onSave: (config: RuntimeConfig) => Promise<void>
}) {
  const [draft, setDraft] = useState<RuntimeConfig>(config)
  const [error, setError] = useState('')
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setDraft(config)
    setError('')
    setIsChecking(false)
  }, [config, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isChecking) return
    setError('')
    setIsChecking(true)
    try {
      await onSave(draft)
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : 'Không kiểm tra được kết nối')
    } finally {
      setIsChecking(false)
    }
  }

  const handleReset = () => {
    onReset()
    setDraft(getRuntimeConfig())
    setError('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/65 p-2 backdrop-blur-md md:items-center md:justify-center">
      <form
        className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b0d12]/94 shadow-[0_30px_120px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl"
        onSubmit={handleSubmit}
      >
        <div className="border-b border-white/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-emerald-300">Template setup</p>
              <h3 className="mt-1 text-xl font-semibold text-white">Kết nối lần đầu</h3>
            </div>
            <button
              className="grid size-9 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white"
              onClick={onClose}
              type="button"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldCheck size={16} />
              Thông tin cần nhập
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-500">Tên app</span>
              <input
                className="field-input"
                onChange={(event) => setDraft((current) => ({ ...current, appName: event.target.value }))}
                placeholder="VTARCH OS"
                value={draft.appName}
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-500">Apps Script Web App URL</span>
              <input
                className="field-input"
                inputMode="url"
                onChange={(event) => setDraft((current) => ({ ...current, appsScriptUrl: event.target.value }))}
                placeholder="https://script.google.com/macros/s/.../exec"
                value={draft.appsScriptUrl}
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              ['1', 'Copy Sheet'],
              ['2', 'Deploy Script'],
              ['3', 'Dán URL'],
            ].map(([step, label]) => (
              <div className="min-h-16 rounded-2xl border border-white/10 bg-black/20 p-2" key={step}>
                <p className="text-xs text-zinc-600">Bước {step}</p>
                <p className="mt-1 truncate text-xs font-semibold text-zinc-300">{label}</p>
              </div>
            ))}
          </div>

          <div className="min-h-10">
            {error ? (
              <p className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs leading-5 text-rose-100">
                {error}
              </p>
            ) : (
              <p className="px-1 text-xs leading-5 text-zinc-500">
                Token Telegram không lưu trong app này. Token nằm trong Apps Script/Google Sheet của từng người.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-2 border-t border-white/10 p-4">
          <button
            className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white"
            onClick={handleReset}
            type="button"
            aria-label="Xóa cấu hình"
          >
            <RotateCcw size={17} />
          </button>
          <button
            className="min-h-11 rounded-2xl bg-white text-sm font-bold text-zinc-950 shadow-[0_16px_45px_rgba(255,255,255,0.12)] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={isChecking || !draft.appsScriptUrl.trim()}
            type="submit"
          >
            {isChecking ? 'Đang kiểm tra...' : 'Kiểm tra và lưu'}
          </button>
        </div>
      </form>
    </div>
  )
}

function TodayView({
  balance,
  busyTaskId,
  expense,
  focusTask,
  onCapture,
  onStatusChange,
  openTasks,
  overdueCount,
  setActiveView,
  setSelectedTaskId,
  tasks,
}: {
  balance: number
  busyTaskId: string
  expense: number
  focusTask?: Task
  onCapture: () => void
  onStatusChange: (task: Task, status: Task['Status']) => void
  openTasks: Task[]
  overdueCount: number
  setActiveView: (view: ViewId) => void
  setSelectedTaskId: (id: string) => void
  tasks: Task[]
}) {
  return (
    <div className="space-y-4">
      <FocusCard
        busyTaskId={busyTaskId}
        onCapture={onCapture}
        onStatusChange={onStatusChange}
        task={focusTask}
      />

      <section className="grid grid-cols-3 gap-2">
        <MetricCard icon={CheckCircle2} label="Đang mở" value={openTasks.length} />
        <MetricCard icon={Bell} label="Quá hạn" value={overdueCount} />
        <MetricCard icon={WalletCards} label="Chi" value={formatMoney(expense)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Panel title="Việc cần xử lý" action="Tất cả" onAction={() => setActiveView('tasks')}>
          <TaskList
            selectedId={focusTask?.ID}
            setSelectedTaskId={(id) => {
              setSelectedTaskId(id)
              setActiveView('tasks')
            }}
            tasks={tasks.slice(0, 6)}
          />
        </Panel>

        <Panel title="Tài chính">
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Còn lại</p>
              <p className={balance >= 0 ? 'mt-2 text-3xl font-semibold text-white' : 'mt-2 text-3xl font-semibold text-amber-200'}>
                {formatMoney(balance)}
              </p>
            </div>
            <button
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] text-sm font-medium text-zinc-200 hover:bg-white/[0.08]"
              onClick={() => setActiveView('finance')}
              type="button"
            >
              <CreditCard size={15} />
              Xem thu chi
            </button>
          </div>
        </Panel>
      </section>
    </div>
  )
}

function FocusCard({
  busyTaskId,
  onCapture,
  onStatusChange,
  task,
}: {
  busyTaskId: string
  onCapture: () => void
  onStatusChange: (task: Task, status: Task['Status']) => void
  task?: Task
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/[0.12] bg-white/[0.065] p-4 shadow-[0_30px_110px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl md:p-5">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-80"
        style={{
          background:
            'linear-gradient(115deg, rgba(255,255,255,0.12), transparent 28%), linear-gradient(245deg, rgba(125,211,252,0.12), transparent 34%)',
        }}
      />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <span className="rounded-full border border-white/[0.15] bg-white/[0.08] px-2.5 py-1 text-xs font-medium text-[#dffcf2]">
            Hôm nay
          </span>
          <h3 className="mt-4 max-w-3xl text-2xl font-semibold text-white md:text-3xl">
            {task?.Title || 'Chưa có việc cần tập trung.'}
          </h3>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300 backdrop-blur">
              {task?.Project || 'Personal OS'}
            </span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300 backdrop-blur">
              {formatDate(task?.DueAt)}
            </span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300 backdrop-blur">
              {task?.Priority || 'P2'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:w-64">
          <button
            className="min-h-10 rounded-2xl border border-white/10 bg-white/[0.055] text-sm font-medium text-zinc-200 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!task || busyTaskId === task.ID || task.Status === 'Doing'}
            onClick={() => task && onStatusChange(task, 'Doing')}
            type="button"
          >
            Đang làm
          </button>
          <button
            className="min-h-10 rounded-2xl bg-white text-sm font-semibold text-zinc-950 shadow-[0_16px_45px_rgba(255,255,255,0.12)] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!task || busyTaskId === task.ID || task.Status === 'Done'}
            onClick={() => task && onStatusChange(task, 'Done')}
            type="button"
          >
            {task && busyTaskId === task.ID ? 'Đang lưu' : 'Xong'}
          </button>
          <button
            className="col-span-2 min-h-10 rounded-2xl border border-white/10 bg-black/20 text-sm font-medium text-zinc-300 hover:bg-white/[0.06]"
            onClick={onCapture}
            type="button"
          >
            + Ghi nhanh
          </button>
        </div>
      </div>
    </section>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: number | string
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.055] p-3 shadow-[0_18px_60px_rgba(0,0,0,0.20),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
      <div className="flex items-center gap-2 text-zinc-500">
        <Icon size={14} />
        <span className="truncate text-xs uppercase tracking-[0.1em]">{label}</span>
      </div>
      <p className="mt-2 truncate text-2xl font-semibold text-white">{value}</p>
    </article>
  )
}

function TasksView({
  busyTaskId,
  onCapture,
  onStatusChange,
  selectedTask,
  setSelectedTaskId,
  tasks,
}: {
  busyTaskId: string
  onCapture: () => void
  onStatusChange: (task: Task, status: Task['Status']) => void
  selectedTask?: Task
  setSelectedTaskId: (id: string) => void
  tasks: Task[]
}) {
  const [filter, setFilter] = useState<TaskStatusFilter>('Open')
  const filteredTasks = tasks.filter((task) => {
    if (filter === 'All') return true
    if (filter === 'Open') return isOpenTask(task)
    return task.Status === filter
  })

  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <Panel title="Công việc" action="Ghi nhanh" onAction={onCapture}>
        <TaskFilters active={filter} onChange={setFilter} />
        <div className="mt-3">
          <TaskList
            selectedId={selectedTask?.ID}
            setSelectedTaskId={setSelectedTaskId}
            tasks={filteredTasks}
          />
        </div>
      </Panel>

      <TaskDetail
        busyTaskId={busyTaskId}
        onStatusChange={onStatusChange}
        task={selectedTask}
      />
    </section>
  )
}

function TaskFilters({
  active,
  onChange,
}: {
  active: TaskStatusFilter
  onChange: (filter: TaskStatusFilter) => void
}) {
  const filters: Array<{ id: TaskStatusFilter; label: string }> = [
    { id: 'Open', label: 'Đang mở' },
    { id: 'Inbox', label: 'Mới' },
    { id: 'Doing', label: 'Đang làm' },
    { id: 'Waiting', label: 'Chờ' },
    { id: 'Done', label: 'Xong' },
    { id: 'All', label: 'Tất cả' },
  ]

  return (
    <div className="app-scroll flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-black/20 p-1">
      {filters.map((filter) => (
        <button
          className={`min-h-8 shrink-0 rounded-xl px-3 text-xs font-medium transition ${
            active === filter.id
              ? 'bg-white text-zinc-950'
              : 'text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-100'
          }`}
          key={filter.id}
          onClick={() => onChange(filter.id)}
          type="button"
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}

function TaskList({
  selectedId,
  setSelectedTaskId,
  tasks,
}: {
  selectedId?: string
  setSelectedTaskId: (id: string) => void
  tasks: Task[]
}) {
  if (!tasks.length) {
    return <EmptyState body="Chưa có dữ liệu." title="Danh sách trống" />
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <button
          className={`flex min-h-[72px] w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
            selectedId === task.ID
              ? 'border-white/25 bg-white/[0.08]'
              : 'border-white/10 bg-black/[0.18] hover:border-white/20 hover:bg-white/[0.06]'
          }`}
          key={task.ID}
          onClick={() => setSelectedTaskId(task.ID)}
          type="button"
        >
          <span className="mt-1">
            {task.Status === 'Done' ? (
              <Check className="text-emerald-400" size={16} />
            ) : (
              <Circle className="text-zinc-600" size={16} />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-zinc-100">{task.Title}</span>
            <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span>{task.Project || 'Không có dự án'}</span>
              <span>{formatDate(task.DueAt)}</span>
            </span>
          </span>
          <span className={`rounded-full px-2 py-1 text-xs ring-1 ${priorityTone[task.Priority]}`}>
            {task.Priority}
          </span>
        </button>
      ))}
    </div>
  )
}

function TaskDetail({
  busyTaskId,
  onStatusChange,
  task,
}: {
  busyTaskId: string
  onStatusChange: (task: Task, status: Task['Status']) => void
  task?: Task
}) {
  if (!task) {
    return (
      <Panel title="Chi tiết">
        <EmptyState body="Chọn một việc để xem chi tiết." title="Chưa chọn việc" />
      </Panel>
    )
  }

  return (
    <Panel title="Chi tiết">
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold leading-7 text-white">{task.Title}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs ring-1 ${statusTone[task.Status]}`}>
              {statusLabel[task.Status]}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs ring-1 ${priorityTone[task.Priority]}`}>
              {task.Priority}
            </span>
          </div>
        </div>

        <dl className="grid gap-3 text-sm">
          {[
            ['Dự án', task.Project || 'Không có dự án'],
            ['Hạn', formatDate(task.DueAt)],
            ['Nhắc', formatDate(task.RemindAt)],
            ['Nguồn', task.Source || 'Web'],
          ].map(([label, value]) => (
            <div className="grid grid-cols-[72px_1fr] gap-3" key={label}>
              <dt className="text-zinc-500">{label}</dt>
              <dd className="text-zinc-300">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Ghi chú</p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            {task.Note || 'Chưa có ghi chú.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(['Inbox', 'Doing', 'Waiting', 'Done'] as const).map((status) => {
            const isActive = task.Status === status
            const isBusy = busyTaskId === task.ID
            return (
              <button
                className={`min-h-10 rounded-2xl border text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  isActive
                    ? 'border-white bg-white text-zinc-950'
                    : 'border-white/10 bg-white/[0.035] text-zinc-300 hover:border-white/20 hover:bg-white/[0.07]'
                }`}
                disabled={isBusy || isActive}
                key={status}
                onClick={() => onStatusChange(task, status)}
                type="button"
              >
                {isBusy && !isActive ? 'Đang lưu...' : statusLabel[status]}
              </button>
            )
          })}
        </div>
      </div>
    </Panel>
  )
}

function CaptureView({
  error,
  isSaving,
  notes,
  onCreate,
}: {
  error: string
  isSaving: boolean
  notes: DashboardData['notes']
  onCreate: (draft: CaptureDraft) => Promise<boolean>
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <Panel title="Ghi nhanh">
        <CaptureForm error={error} isSaving={isSaving} onCreate={onCreate} />
      </Panel>

      <Panel title="Ghi chú gần đây">
        <div className="space-y-2">
          {notes.length ? (
            notes.slice(0, 8).map((note) => (
              <article className="min-h-[92px] rounded-2xl border border-white/10 bg-black/20 p-3" key={note.ID}>
                <p className="text-sm leading-6 text-zinc-300">{note.Content}</p>
                <p className="mt-2 text-xs text-zinc-500">{note.Project || 'Quick capture'}</p>
              </article>
            ))
          ) : (
            <EmptyState body="Chưa có dữ liệu." title="Chưa có ghi chú" />
          )}
        </div>
      </Panel>
    </section>
  )
}

function CaptureForm({
  error,
  isSaving,
  onCreate,
}: {
  error: string
  isSaving: boolean
  onCreate: (draft: CaptureDraft) => Promise<boolean>
}) {
  const [draft, setDraft] = useState<CaptureDraft>(emptyDraft)
  const [activePicker, setActivePicker] = useState<CapturePicker>('idle')

  const isValid =
    draft.kind === 'task'
      ? Boolean(draft.title.trim())
      : draft.kind === 'note'
        ? Boolean(draft.content.trim())
        : Boolean(Number(draft.amount) > 0)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isValid || isSaving) return
    const saved = await onCreate(draft)
    if (saved) {
      setDraft((current) => ({
        ...emptyDraft,
        date: new Date().toISOString().slice(0, 10),
        kind: current.kind,
      }))
      setActivePicker('idle')
    }
  }

  return (
    <form className="flex min-h-[31rem] flex-col" onSubmit={handleSubmit}>
      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-black/20 p-1">
        {[
          ['task', 'Việc', CheckCircle2],
          ['note', 'Note', NotebookText],
          ['finance', 'Thu chi', WalletCards],
        ].map(([kind, label, Icon]) => {
          const TypedIcon = Icon as LucideIcon
          return (
            <button
              className={`min-h-10 rounded-xl text-sm font-medium transition ${
                draft.kind === kind
                  ? 'bg-white text-zinc-950'
                  : 'text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-100'
              }`}
              key={kind as string}
              onClick={() => {
                setDraft((current) => ({ ...current, kind: kind as CaptureKind }))
                setActivePicker('idle')
              }}
              type="button"
            >
              <span className="inline-flex items-center gap-2">
                <TypedIcon size={14} />
                {label as string}
              </span>
            </button>
          )
        })}
      </div>

      <div className="capture-fields">
        <CaptureMainInput draft={draft} setDraft={setDraft} />
        <CaptureToolbar
          activePicker={activePicker}
          draft={draft}
          setActivePicker={setActivePicker}
        />
        <CapturePickerPanel
          activePicker={activePicker}
          draft={draft}
          setDraft={setDraft}
        />
      </div>

      <button
        className="mt-auto min-h-11 w-full rounded-2xl bg-white text-sm font-bold text-zinc-950 shadow-[0_16px_45px_rgba(255,255,255,0.12)] disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!isValid || isSaving}
        type="submit"
      >
        {isSaving ? 'Đang lưu...' : 'Lưu'}
      </button>
      <div className="capture-error-slot mt-3">
        {error ? (
          <p className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs leading-5 text-rose-100">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  )
}

function CaptureMainInput({
  draft,
  setDraft,
}: {
  draft: CaptureDraft
  setDraft: React.Dispatch<React.SetStateAction<CaptureDraft>>
}) {
  if (draft.kind === 'finance') {
    return (
      <div className="mt-4 h-32 rounded-3xl border border-white/10 bg-black/20 p-3">
        <div className="grid h-full grid-rows-[1fr_1fr] gap-2">
          <input
            autoFocus
            className="w-full bg-transparent text-3xl font-semibold text-white outline-none placeholder:text-zinc-700"
            inputMode="numeric"
            onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
            placeholder="0"
            type="number"
            value={draft.amount}
          />
          <input
            className="w-full bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="Mô tả giao dịch"
            value={draft.title}
          />
        </div>
      </div>
    )
  }

  const value = draft.kind === 'task' ? draft.title : draft.content
  const placeholder = draft.kind === 'task' ? 'Việc cần làm...' : 'Ghi chú nhanh...'

  return (
    <div className="mt-4 h-32 rounded-3xl border border-white/10 bg-black/20 p-3">
      <textarea
        autoFocus
        className="stable-textarea h-full w-full resize-none bg-transparent text-xl font-semibold leading-7 text-white outline-none placeholder:text-zinc-700"
        onChange={(event) =>
          setDraft((current) => ({
            ...current,
            [draft.kind === 'task' ? 'title' : 'content']: event.target.value,
          }))
        }
        placeholder={placeholder}
        value={value}
      />
    </div>
  )
}

function CaptureToolbar({
  activePicker,
  draft,
  setActivePicker,
}: {
  activePicker: CapturePicker
  draft: CaptureDraft
  setActivePicker: (picker: CapturePicker) => void
}) {
  const tools: Array<{ icon: LucideIcon; id: CapturePicker; label: string; value: string }> =
    draft.kind === 'task'
      ? [
          { icon: CalendarDays, id: 'date', label: 'Hạn', value: draft.dueAt ? formatDate(draft.dueAt) : 'Chưa đặt' },
          { icon: Flag, id: 'priority', label: 'Ưu tiên', value: draft.priority },
          { icon: Folder, id: 'project', label: 'Dự án', value: draft.project || 'Personal OS' },
          { icon: NotebookText, id: 'note', label: 'Ghi chú', value: draft.note ? 'Có ghi chú' : 'Trống' },
        ]
      : draft.kind === 'note'
        ? [
            { icon: Folder, id: 'project', label: 'Dự án', value: draft.project || 'Quick capture' },
            { icon: Tags, id: 'category', label: 'Tag', value: draft.category || 'Chưa đặt' },
          ]
        : [
            { icon: WalletCards, id: 'financeType', label: 'Loại', value: draft.financeType === 'expense' ? 'Chi' : 'Thu' },
            { icon: CalendarDays, id: 'date', label: 'Ngày', value: draft.date || 'Hôm nay' },
            { icon: Tags, id: 'category', label: 'Nhóm', value: draft.category || 'general' },
            { icon: Folder, id: 'project', label: 'Dự án', value: draft.project || 'Không có' },
          ]

  return (
    <div className="mt-3 grid grid-cols-4 gap-2">
      {tools.map(({ icon: Icon, id, label, value }) => (
        <button
          className={`min-h-[4.25rem] rounded-2xl border px-2 py-2 text-left transition ${
            activePicker === id
              ? 'border-white/25 bg-white text-zinc-950'
              : 'border-white/10 bg-white/[0.045] text-zinc-300 hover:bg-white/[0.07]'
          }`}
          key={id}
          onClick={() => setActivePicker(activePicker === id ? 'idle' : id)}
          type="button"
        >
          <Icon size={15} />
          <span className="mt-1 block truncate text-[11px] font-semibold">{label}</span>
          <span className={`block truncate text-[10px] ${activePicker === id ? 'text-zinc-600' : 'text-zinc-500'}`}>
            {value}
          </span>
        </button>
      ))}
      {Array.from({ length: 4 - tools.length }).map((_, index) => (
        <div
          className="min-h-[4.25rem] rounded-2xl border border-white/5 bg-white/[0.02]"
          key={`empty-${index}`}
        />
      ))}
    </div>
  )
}

function CapturePickerPanel({
  activePicker,
  draft,
  setDraft,
}: {
  activePicker: CapturePicker
  draft: CaptureDraft
  setDraft: React.Dispatch<React.SetStateAction<CaptureDraft>>
}) {
  if (activePicker === 'idle') {
    return (
      <div className="mt-3 h-28 rounded-3xl border border-white/10 bg-white/[0.035] p-3">
        <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Chi tiết</p>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Chọn một nút phía trên để thêm ngày, dự án, ưu tiên hoặc nhóm. Khung này luôn giữ nguyên chiều cao.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-3 h-28 rounded-3xl border border-white/10 bg-white/[0.035] p-3">
      {activePicker === 'date' ? (
        <input
          className="field-input"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              [draft.kind === 'finance' ? 'date' : 'dueAt']: event.target.value,
            }))
          }
          type={draft.kind === 'finance' ? 'date' : 'datetime-local'}
          value={draft.kind === 'finance' ? draft.date : draft.dueAt}
        />
      ) : null}
      {activePicker === 'priority' ? (
        <div className="grid grid-cols-3 gap-2">
          {(['P1', 'P2', 'P3'] as const).map((priority) => (
            <button
              className={`min-h-12 rounded-2xl border text-sm font-semibold ${
                draft.priority === priority
                  ? 'border-white bg-white text-zinc-950'
                  : 'border-white/10 bg-black/20 text-zinc-300'
              }`}
              key={priority}
              onClick={() => setDraft((current) => ({ ...current, priority }))}
              type="button"
            >
              {priority}
            </button>
          ))}
        </div>
      ) : null}
      {activePicker === 'project' ? (
        <input
          autoFocus
          className="field-input"
          onChange={(event) => setDraft((current) => ({ ...current, project: event.target.value }))}
          placeholder="Tên dự án"
          value={draft.project}
        />
      ) : null}
      {activePicker === 'category' ? (
        <input
          autoFocus
          className="field-input"
          onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
          placeholder={draft.kind === 'finance' ? 'ăn uống' : 'ý tưởng'}
          value={draft.category}
        />
      ) : null}
      {activePicker === 'note' ? (
        <textarea
          autoFocus
          className="field-input stable-textarea h-full resize-none py-2"
          onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
          placeholder="Ghi chú thêm"
          value={draft.note}
        />
      ) : null}
      {activePicker === 'financeType' ? (
        <div className="grid grid-cols-2 gap-2">
          {[
            ['expense', 'Chi'],
            ['income', 'Thu'],
          ].map(([type, label]) => (
            <button
              className={`min-h-12 rounded-2xl border text-sm font-semibold ${
                draft.financeType === type
                  ? 'border-white bg-white text-zinc-950'
                  : 'border-white/10 bg-black/20 text-zinc-300'
              }`}
              key={type}
              onClick={() =>
                setDraft((current) => ({ ...current, financeType: type as CaptureDraft['financeType'] }))
              }
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function FinanceView({
  balance,
  expense,
  finance,
  income,
  onCapture,
}: {
  balance: number
  expense: number
  finance: DashboardData['finance']
  income: number
  onCapture: () => void
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Panel title="Tài chính" action="Ghi nhanh" onAction={onCapture}>
        <div className="space-y-2">
          {[
            ['Thu', income, 'text-emerald-300'],
            ['Chi', expense, 'text-rose-300'],
            ['Còn lại', balance, balance >= 0 ? 'text-sky-300' : 'text-amber-300'],
          ].map(([label, value, tone]) => (
            <div className="flex min-h-[54px] items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-3 py-3" key={label as string}>
              <span className="text-sm text-zinc-500">{label as string}</span>
              <span className={`text-sm font-semibold ${tone as string}`}>
                {formatMoney(Number(value))} VND
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Giao dịch gần đây">
        <div className="space-y-2">
          {finance.length ? (
            finance.slice(0, 12).map((item) => (
              <div className="flex min-h-[64px] items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-3" key={item.ID}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{item.Description || item.Category}</p>
                  <p className="mt-1 text-xs text-zinc-500">{item.Date} · {item.Type}</p>
                </div>
                <span className={item.Type === 'income' ? 'text-emerald-300' : 'text-rose-300'}>
                  {formatMoney(item.Amount)}
                </span>
              </div>
            ))
          ) : (
            <EmptyState body="Chưa có dữ liệu." title="Chưa có giao dịch" />
          )}
        </div>
      </Panel>
    </section>
  )
}

function CaptureModal({
  error,
  isOpen,
  isSaving,
  onClose,
  onCreate,
}: {
  error: string
  isOpen: boolean
  isSaving: boolean
  onClose: () => void
  onCreate: (draft: CaptureDraft) => Promise<boolean>
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/60 p-2 backdrop-blur-md md:items-center md:justify-center">
      <div className="app-scroll max-h-[calc(100dvh-1rem)] w-full overflow-y-auto rounded-3xl border border-white/10 bg-[#0b0d12]/90 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl md:max-w-lg">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-300">Capture</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Ghi nhanh</h3>
          </div>
          <button
            className="grid size-9 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X size={17} />
          </button>
        </div>
        <CaptureForm error={error} isSaving={isSaving} onCreate={onCreate} />
      </div>
    </div>
  )
}

function Panel({
  action,
  children,
  onAction,
  title,
}: {
  action?: string
  children: React.ReactNode
  onAction?: () => void
  title: string
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.052] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
      <div className="mb-3 flex min-h-7 items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {action ? (
          <button
            className="text-xs font-medium text-zinc-500 hover:text-zinc-100"
            onClick={onAction}
            type="button"
          >
            {action}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function EmptyState({ body, title }: { body: string; title: string }) {
  return (
    <div className="min-h-[112px] rounded-3xl border border-dashed border-white/15 bg-white/[0.04] p-5 backdrop-blur">
      <p className="font-medium text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{body}</p>
    </div>
  )
}

function MobileNav({
  activeView,
  setActiveView,
}: {
  activeView: ViewId
  setActiveView: (view: ViewId) => void
}) {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-30 mx-auto grid max-w-[760px] grid-cols-4 rounded-3xl border border-white/10 bg-[#111318]/82 p-1 shadow-2xl shadow-black/60 backdrop-blur-2xl">
      {views.map(({ id, label, icon: Icon }) => (
        <button
          className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] transition ${
            activeView === id
              ? 'bg-white text-zinc-950 shadow-[0_10px_24px_rgba(255,255,255,0.12)]'
              : 'text-zinc-500 hover:text-zinc-100'
          }`}
          key={id}
          onClick={() => setActiveView(id)}
          type="button"
        >
          <Icon size={16} />
          <span className="max-w-full truncate">{label}</span>
        </button>
      ))}
    </nav>
  )
}

export default App
