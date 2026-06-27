import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowUpRight,
  Bell,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  CreditCard,
  LayoutDashboard,
  MoreHorizontal,
  NotebookText,
  Plus,
  Search,
  Send,
  TrendingUp,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import { getDashboardData } from '@/lib/api'
import { mockDashboardData } from '@/lib/mock-data'
import type { DashboardData, Task } from '@/types'

type ViewId = 'overview' | 'tasks' | 'calendar' | 'notes' | 'finance' | 'automation'

type TaskDraft = {
  dueAt: string
  note: string
  priority: Task['Priority']
  project: string
  title: string
}

const views: Array<{ id: ViewId; label: string; icon: LucideIcon }> = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'tasks', label: 'Công việc', icon: CheckCircle2 },
  { id: 'calendar', label: 'Lịch', icon: CalendarDays },
  { id: 'notes', label: 'Ghi chú', icon: NotebookText },
  { id: 'finance', label: 'Tài chính', icon: CreditCard },
  { id: 'automation', label: 'Tự động', icon: Bot },
]

const chartData = [
  { day: 'T2', done: 2 },
  { day: 'T3', done: 4 },
  { day: 'T4', done: 3 },
  { day: 'T5', done: 6 },
  { day: 'T6', done: 5 },
  { day: 'T7', done: 3 },
  { day: 'CN', done: 4 },
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

function App() {
  const [dashboard, setDashboard] = useState<DashboardData>(mockDashboardData)
  const [source, setSource] = useState('dữ liệu mẫu')
  const [activeView, setActiveView] = useState<ViewId>('overview')
  const [selectedTaskId, setSelectedTaskId] = useState<string>(mockDashboardData.tasks[0]?.ID || '')
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)

  useEffect(() => {
    getDashboardData()
      .then((data) => {
        const hasRows = data.tasks.length || data.notes.length || data.finance.length
        const nextDashboard = hasRows ? data : mockDashboardData
        setDashboard(nextDashboard)
        setSelectedTaskId(nextDashboard.tasks[0]?.ID || '')
        setSource(
          import.meta.env.VITE_APPS_SCRIPT_URL
            ? hasRows
              ? 'Google Sheets'
              : 'Google Sheets · dữ liệu mẫu'
            : 'dữ liệu mẫu',
        )
      })
      .catch(() => {
        setDashboard(mockDashboardData)
        setSelectedTaskId(mockDashboardData.tasks[0]?.ID || '')
        setSource('dữ liệu mẫu')
      })
  }, [])

  const openTasks = useMemo(
    () => dashboard.tasks.filter((task) => !['Done', 'Cancelled'].includes(task.Status)),
    [dashboard.tasks],
  )

  const selectedTask =
    dashboard.tasks.find((task) => task.ID === selectedTaskId) ||
    openTasks[0] ||
    dashboard.tasks[0]

  const doneCount = dashboard.tasks.filter((task) => task.Status === 'Done').length
  const expenseLabel = formatMoney(dashboard.metrics.weeklyExpense)

  const metrics = [
    ['Đang mở', openTasks.length, 'việc cần xử lý', CheckCircle2],
    ['Quá hạn', dashboard.metrics.overdueTasks, 'cần xem lại', Bell],
    ['Chi tuần này', expenseLabel, 'VND', TrendingUp],
    ['Ghi chú', dashboard.metrics.notes, 'mục đã lưu', NotebookText],
  ] as const

  const board = [
    ['Mới', dashboard.tasks.filter((task) => task.Status === 'Inbox').length, 'bg-sky-300'],
    ['Đang làm', dashboard.tasks.filter((task) => task.Status === 'Doing').length, 'bg-amber-300'],
    ['Đang chờ', dashboard.tasks.filter((task) => task.Status === 'Waiting').length, 'bg-violet-300'],
    ['Xong', doneCount, 'bg-emerald-300'],
  ] as const

  const activeLabel = views.find((view) => view.id === activeView)?.label || 'Tổng quan'

  const handleCreateTask = (draft: TaskDraft) => {
    const now = new Date().toISOString()
    const task: Task = {
      ID: `local-${Date.now()}`,
      Title: draft.title.trim(),
      Status: 'Inbox',
      Priority: draft.priority,
      Project: draft.project.trim() || 'Personal OS',
      Tags: '',
      DueAt: draft.dueAt ? new Date(draft.dueAt).toISOString() : '',
      RemindAt: '',
      Note: draft.note.trim(),
      CreatedAt: now,
      DoneAt: '',
      Source: 'Web',
    }

    setDashboard((current) => ({
      ...current,
      tasks: [task, ...current.tasks],
      metrics: {
        ...current.metrics,
        todayTasks: current.metrics.todayTasks + 1,
      },
    }))
    setSelectedTaskId(task.ID)
    setActiveView('tasks')
    setIsQuickAddOpen(false)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050609] pb-20 text-zinc-100 lg:pb-0">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-80"
        style={{
          backgroundImage:
            'linear-gradient(120deg, rgba(255,255,255,0.12), transparent 18%, rgba(125,211,252,0.08) 42%, transparent 64%), linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 48px 48px, 48px 48px',
        }}
      />
      <div className="relative mx-auto grid min-h-screen max-w-[1480px] grid-cols-1 lg:grid-cols-[252px_1fr]">
        <Sidebar activeView={activeView} setActiveView={setActiveView} source={source} />

        <section className="min-w-0 border-white/10 lg:border-l">
          <Topbar
            activeLabel={activeLabel}
            activeView={activeView}
            onQuickAdd={() => setIsQuickAddOpen(true)}
            setActiveView={setActiveView}
          />

          <div className="p-3 md:p-5">
            {activeView === 'overview' && (
              <OverviewView
                board={board}
                metrics={metrics}
                onQuickAdd={() => setIsQuickAddOpen(true)}
                selectedTask={selectedTask}
                setActiveView={setActiveView}
                setSelectedTaskId={setSelectedTaskId}
                tasks={dashboard.tasks}
              />
            )}
            {activeView === 'tasks' && (
              <TasksView
                onQuickAdd={() => setIsQuickAddOpen(true)}
                selectedTask={selectedTask}
                setSelectedTaskId={setSelectedTaskId}
                tasks={dashboard.tasks}
              />
            )}
            {activeView === 'calendar' && <CalendarView tasks={openTasks} />}
            {activeView === 'notes' && <NotesView notes={dashboard.notes} />}
            {activeView === 'finance' && (
              <FinanceView expenseLabel={expenseLabel} finance={dashboard.finance} />
            )}
            {activeView === 'automation' && <AutomationView source={source} />}
          </div>
        </section>
      </div>

      <QuickAddSheet
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onCreate={handleCreateTask}
      />
      <MobileNav activeView={activeView} setActiveView={setActiveView} />
    </main>
  )
}

function Sidebar({
  activeView,
  setActiveView,
  source,
}: {
  activeView: ViewId
  setActiveView: (view: ViewId) => void
  source: string
}) {
  return (
    <aside className="hidden border-r border-white/10 bg-white/[0.045] px-3 py-4 shadow-[inset_-1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-2xl lg:block">
      <div className="flex items-center gap-3 px-2">
        <div className="grid size-9 place-items-center rounded-md bg-zinc-100 text-zinc-950">
          <Send size={17} />
        </div>
        <div>
          <p className="text-xs text-zinc-500">Personal workspace</p>
          <h1 className="text-sm font-semibold text-white">VTARCH OS</h1>
        </div>
      </div>

      <button className="mt-5 flex min-h-10 w-full items-center gap-2 rounded-md border border-white/10 bg-white/[0.055] px-3 text-left text-sm text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <Search size={15} />
        <span className="flex-1 truncate">Tìm kiếm...</span>
        <span className="rounded border border-white/10 bg-black/20 px-1.5 text-[10px]">Ctrl K</span>
      </button>

      <nav className="mt-5 space-y-1">
        {views.map(({ id, label, icon: Icon }) => (
          <button
            className={`flex min-h-9 w-full items-center gap-3 rounded-md px-2.5 text-left text-sm transition ${
              activeView === id
                ? 'bg-white text-zinc-950 shadow-[0_12px_30px_rgba(255,255,255,0.10)]'
                : 'text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-100'
            }`}
            key={id}
            onClick={() => setActiveView(id)}
            type="button"
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-6 rounded-md border border-white/10 bg-white/[0.055] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
            Sync
          </span>
          <span className="size-2 rounded-full bg-emerald-400" />
        </div>
        <p className="mt-3 text-sm text-zinc-300">{source}</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">Đang đồng bộ</p>
      </div>

    </aside>
  )
}

function Topbar({
  activeLabel,
  activeView,
  onQuickAdd,
  setActiveView,
}: {
  activeLabel: string
  activeView: ViewId
  onQuickAdd: () => void
  setActiveView: (view: ViewId) => void
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#050609]/72 px-3 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-2xl md:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">VTARCH OS</p>
          <h2 className="truncate text-lg font-semibold text-white">{activeLabel}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex min-h-9 items-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.22),0_18px_45px_rgba(255,255,255,0.12)] transition hover:bg-[#eefbf6]"
            onClick={onQuickAdd}
            type="button"
          >
            <Plus size={15} />
            Thêm việc
          </button>
        </div>
      </div>

      <div className="mt-3 hidden gap-1 overflow-x-auto md:flex">
        {views.map(({ id, label }) => (
          <button
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              activeView === id
                ? 'bg-white text-zinc-950 shadow-[0_10px_26px_rgba(255,255,255,0.10)]'
                : 'text-zinc-400 hover:bg-white/[0.07] hover:text-white'
            }`}
            key={id}
            onClick={() => setActiveView(id)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
    </header>
  )
}

function OverviewView({
  board,
  metrics,
  onQuickAdd,
  selectedTask,
  setActiveView,
  setSelectedTaskId,
  tasks,
}: {
  board: ReadonlyArray<readonly [string, number, string]>
  metrics: ReadonlyArray<readonly [string, string | number, string, LucideIcon]>
  onQuickAdd: () => void
  selectedTask?: Task
  setActiveView: (view: ViewId) => void
  setSelectedTaskId: (id: string) => void
  tasks: Task[]
}) {
  return (
    <div className="space-y-4">
      <FocusHero selectedTask={selectedTask} tasks={tasks} />
      <QuickActions onQuickAdd={onQuickAdd} setActiveView={setActiveView} />

      <section className="grid grid-cols-4 gap-2 rounded-md border border-white/10 bg-white/[0.055] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl md:gap-3 md:p-3">
        {metrics.map(([title, value, meta, Icon]) => (
          <div className="min-w-0 rounded border border-white/10 bg-black/20 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:p-3" key={title}>
            <div className="flex items-center gap-1.5 md:justify-between">
              <Icon className="shrink-0 text-zinc-500" size={14} />
              <p className="min-w-0 truncate text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500 md:text-xs">{title}</p>
            </div>
            <p className="mt-2 truncate text-xl font-semibold text-white md:text-2xl">{value}</p>
            <p className="mt-0.5 hidden truncate text-xs uppercase tracking-[0.12em] text-zinc-600 sm:block">{meta}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Panel title="Hôm nay" action="Xem tất cả" onAction={() => setActiveView('tasks')}>
          <TaskList
            selectedId={selectedTask?.ID}
            setSelectedTaskId={setSelectedTaskId}
            tasks={tasks}
          />
        </Panel>

        <TaskDetail task={selectedTask} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Panel title="Nhịp làm việc">
          <div className="h-56">
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="done" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#a1a1aa" stopOpacity={0.42} />
                    <stop offset="95%" stopColor="#a1a1aa" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="day"
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#111318',
                    border: '1px solid #27272a',
                    borderRadius: 8,
                    color: '#f4f4f5',
                  }}
                />
                <Area
                  dataKey="done"
                  fill="url(#done)"
                  stroke="#d4d4d8"
                  strokeWidth={2}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Trạng thái">
          <div className="grid grid-cols-2 gap-2">
            {board.map(([label, count, dot]) => (
              <div className="rounded-md border border-white/10 bg-black/20 p-3" key={label}>
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${dot}`} />
                  <span className="text-sm text-zinc-400">{label}</span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-white">{count}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  )
}

function QuickActions({
  onQuickAdd,
  setActiveView,
}: {
  onQuickAdd: () => void
  setActiveView: (view: ViewId) => void
}) {
  const actions: Array<{
    accent: string
    description: string
    icon: LucideIcon
    label: string
    target: ViewId
  }> = [
    {
      accent: 'from-emerald-300/22 to-transparent text-emerald-200',
      description: 'Task mới',
      icon: CheckCircle2,
      label: 'Ghi việc mới',
      target: 'tasks',
    },
    {
      accent: 'from-sky-300/22 to-transparent text-sky-200',
      description: 'Ý tưởng',
      icon: NotebookText,
      label: 'Lưu ghi chú',
      target: 'notes',
    },
    {
      accent: 'from-amber-300/22 to-transparent text-amber-200',
      description: 'Thu chi',
      icon: WalletCards,
      label: 'Ghi tài chính',
      target: 'finance',
    },
    {
      accent: 'from-violet-300/22 to-transparent text-violet-200',
      description: 'Bot',
      icon: Bot,
      label: 'Tự động hóa',
      target: 'automation',
    },
  ]

  const [primaryAction, ...secondaryActions] = actions
  const PrimaryIcon = primaryAction.icon

  return (
    <section className="grid gap-3 md:grid-cols-[1.2fr_2fr]">
      <button
        className="group relative min-h-[116px] overflow-hidden rounded-md border border-white/25 bg-white/[0.72] px-4 py-4 text-left text-zinc-950 shadow-[0_30px_90px_rgba(210,255,241,0.13),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-white"
        onClick={onQuickAdd}
        type="button"
      >
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"
        />
        <span className="relative inline-flex size-10 items-center justify-center rounded-md bg-black/80 text-[#d6fff0] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
          <PrimaryIcon size={18} />
        </span>
        <span className="relative mt-4 block text-lg font-bold">{primaryAction.label}</span>
        <span className="relative mt-1 block text-sm text-zinc-700">{primaryAction.description}</span>
      </button>

      <div className="grid grid-cols-3 gap-2">
        {secondaryActions.map(({ accent, description, icon: Icon, label, target }) => (
        <button
          className="group min-h-[116px] overflow-hidden rounded-md border border-white/10 bg-white/[0.05] p-3 text-left shadow-[0_18px_55px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08]"
          key={label}
          onClick={() => setActiveView(target)}
          type="button"
        >
          <span className={`inline-flex size-8 items-center justify-center rounded-md bg-gradient-to-br ${accent}`}>
            <Icon size={16} />
          </span>
          <span className="mt-3 block truncate text-sm font-semibold text-white">{label}</span>
          <span className="mt-1 block text-xs text-zinc-500">{description}</span>
        </button>
        ))}
      </div>
    </section>
  )
}

function FocusHero({ selectedTask, tasks }: { selectedTask?: Task; tasks: Task[] }) {
  const todayCount = tasks.filter((task) => task.DueAt).length
  const doneCount = tasks.filter((task) => task.Status === 'Done').length
  const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0
  return (
    <section className="relative overflow-hidden rounded-md border border-white/[0.12] bg-white/[0.065] shadow-[0_30px_110px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-90"
        style={{
          background:
            'linear-gradient(115deg, rgba(255,255,255,0.12), transparent 28%), linear-gradient(245deg, rgba(125,211,252,0.12), transparent 34%)',
        }}
      />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
      <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative border-b border-white/10 p-4 md:p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded border border-white/[0.15] bg-white/[0.08] px-2.5 py-1 text-xs font-medium text-[#dffcf2] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              Hôm nay
            </span>
            <span className="text-xs text-zinc-500">{todayCount} lịch hôm nay</span>
          </div>
          <h3 className="mt-4 max-w-2xl text-2xl font-semibold text-white md:text-3xl">
            {selectedTask?.Title || 'Chọn việc quan trọng nhất để bắt đầu ngay.'}
          </h3>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300 backdrop-blur">
              {selectedTask?.Project || 'Personal OS'}
            </span>
            <span className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300 backdrop-blur">
              Hạn: {formatDate(selectedTask?.DueAt)}
            </span>
            <span className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300 backdrop-blur">
              {selectedTask?.Priority || 'P2'}
            </span>
          </div>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-black/30 ring-1 ring-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#dffcf2] via-sky-200 to-white shadow-[0_0_24px_rgba(186,230,253,0.28)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500">{progress}% hoàn thành</p>
        </div>
        <div className="relative grid grid-cols-3 divide-x divide-white/10 lg:grid-cols-1 lg:divide-x-0 lg:divide-y">
          {[
            ['Tập trung', selectedTask?.Status ? statusLabel[selectedTask.Status] : 'Sẵn sàng'],
            ['Bot', 'Telegram'],
            ['Sheet', 'Google'],
          ].map(([label, value]) => (
            <div className="p-4" key={label}>
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">{label}</p>
              <p className="mt-2 truncate text-sm font-medium text-zinc-100 md:text-base">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TasksView({
  onQuickAdd,
  selectedTask,
  setSelectedTaskId,
  tasks,
}: {
  onQuickAdd: () => void
  selectedTask?: Task
  setSelectedTaskId: (id: string) => void
  tasks: Task[]
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <Panel title="Công việc" action="Thêm task" onAction={onQuickAdd}>
        <TaskList selectedId={selectedTask?.ID} setSelectedTaskId={setSelectedTaskId} tasks={tasks} />
      </Panel>
      <TaskDetail task={selectedTask} />
    </section>
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
    return (
      <EmptyState
        body="Chưa có dữ liệu."
        title="Chưa có công việc"
      />
    )
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <button
          className={`flex w-full items-start gap-3 rounded-md border px-3 py-3 text-left transition ${
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
              <span>{task.Source || 'Web'}</span>
            </span>
          </span>
          <span className={`rounded px-2 py-1 text-xs ring-1 ${priorityTone[task.Priority]}`}>
            {task.Priority}
          </span>
        </button>
      ))}
    </div>
  )
}

function TaskDetail({ task }: { task?: Task }) {
  if (!task) {
    return (
      <Panel title="Chi tiết">
        <EmptyState body="Chọn một task để xem nội dung chi tiết." title="Chưa chọn task" />
      </Panel>
    )
  }

  return (
    <Panel title="Chi tiết công việc">
      <div className="space-y-4">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-xl font-semibold leading-7 text-white">{task.Title}</h3>
            <button className="rounded-md p-2 text-zinc-500 hover:bg-zinc-900 hover:text-white">
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`rounded px-2.5 py-1 text-xs ring-1 ${statusTone[task.Status]}`}>
              {statusLabel[task.Status]}
            </span>
            <span className={`rounded px-2.5 py-1 text-xs ring-1 ${priorityTone[task.Priority]}`}>
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
            ['Tags', task.Tags || 'Không có'],
          ].map(([label, value]) => (
            <div className="grid grid-cols-[88px_1fr] gap-3" key={label}>
              <dt className="text-zinc-500">{label}</dt>
              <dd className="text-zinc-300">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Ghi chú</p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            {task.Note || 'Chưa có ghi chú cho công việc này.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button className="min-h-10 rounded-md bg-zinc-100 text-sm font-medium text-zinc-950">
            Hoàn thành
          </button>
          <button className="min-h-10 rounded-md border border-zinc-800 text-sm text-zinc-300">
            Sửa task
          </button>
        </div>
      </div>
    </Panel>
  )
}

function CalendarView({ tasks }: { tasks: Task[] }) {
  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
  const weekItems = weekDays.map((day, index) => ({
    day,
    task: tasks[index],
  }))

  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <Panel title="Lịch tuần">
        <div className="space-y-2 md:hidden">
          {weekItems.map(({ day, task }, index) => (
            <div className="rounded-md border border-white/10 bg-black/20 p-3" key={day}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">{day}</p>
                  <p className="mt-1 text-sm font-semibold text-white">Ngày {index + 1}</p>
                </div>
                <span className="rounded bg-zinc-900 px-2 py-1 text-xs text-zinc-400">
                  {task ? formatDate(task.DueAt) : 'Trống'}
                </span>
              </div>
              {task ? (
                <div className="mt-3 rounded-md border border-emerald-400/20 bg-emerald-400/10 p-3">
                  <p className="text-sm font-medium leading-5 text-emerald-100">{task.Title}</p>
                  <p className="mt-1 text-xs text-emerald-200/70">{task.Project || 'Personal OS'}</p>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="hidden grid-cols-7 gap-2 text-center text-xs text-zinc-500 md:grid">
          {weekDays.map((day) => (
            <div className="rounded-md border border-white/10 bg-black/20 py-2" key={day}>
              {day}
            </div>
          ))}
        </div>
        <div className="mt-2 hidden grid-cols-7 gap-2 md:grid">
          {weekItems.map(({ day, task }, index) => (
            <div className="min-h-32 rounded-md border border-white/10 bg-black/20 p-2 text-xs text-zinc-600" key={day}>
              {index + 1}
              {task ? (
                <div className="mt-3 rounded border border-emerald-400/20 bg-emerald-400/10 p-2 text-left text-emerald-100">
                  <p className="line-clamp-2 font-medium">
                    {task.Title}
                  </p>
                  <p className="mt-1 text-[11px] text-emerald-200/70">
                    {formatDate(task.DueAt)}
                  </p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Sắp tới">
        <div className="space-y-2">
          {tasks.length ? (
            tasks.slice(0, 5).map((task) => (
              <div className="rounded-md border border-white/10 bg-black/20 p-3" key={task.ID}>
                <p className="text-sm font-medium text-white">{task.Title}</p>
                <p className="mt-1 text-xs text-zinc-500">{formatDate(task.DueAt)}</p>
              </div>
            ))
          ) : (
            <EmptyState body="Không có lịch sắp tới." title="Lịch trống" />
          )}
        </div>
      </Panel>
    </section>
  )
}

function NotesView({ notes }: { notes: DashboardData['notes'] }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <article className="rounded-md border border-white/10 bg-white/[0.055] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.16)]">
        <span className="rounded border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-xs font-medium text-sky-200">
          Capture
        </span>
        <h3 className="mt-4 text-lg font-semibold text-white">Kho ý tưởng nhanh</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Ghi lại ý tưởng trước khi biến thành việc.
        </p>
      </article>
      {notes.length ? (
        notes.map((note) => (
          <article className="rounded-md border border-white/10 bg-white/[0.055] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.16)]" key={note.ID}>
            <p className="text-sm leading-6 text-zinc-300">{note.Content}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
              <span>{note.Project || 'Quick capture'}</span>
              <span>{note.Source}</span>
            </div>
          </article>
        ))
      ) : (
        <EmptyState body="Chưa có dữ liệu." title="Chưa có ghi chú" />
      )}
    </section>
  )
}

function FinanceView({
  expenseLabel,
  finance,
}: {
  expenseLabel: string
  finance: DashboardData['finance']
}) {
  const income = finance
    .filter((item) => item.Type === 'income')
    .reduce((total, item) => total + item.Amount, 0)
  const expense = finance
    .filter((item) => item.Type === 'expense')
    .reduce((total, item) => total + item.Amount, 0)
  const balance = income - expense

  return (
    <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Panel title="Tổng quan">
        <p className="text-3xl font-semibold text-white">{expenseLabel} VND</p>
        <p className="mt-1 text-sm text-zinc-500">Chi tuần này</p>
        <div className="mt-5 grid gap-2">
          {[
            ['Thu', formatMoney(income), 'text-emerald-300'],
            ['Chi', formatMoney(expense), 'text-rose-300'],
            ['Còn lại', formatMoney(balance), balance >= 0 ? 'text-sky-300' : 'text-amber-300'],
          ].map(([label, value, tone]) => (
            <div className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 px-3 py-2" key={label}>
              <span className="text-sm text-zinc-500">{label}</span>
              <span className={`text-sm font-semibold ${tone}`}>{value} VND</span>
            </div>
          ))}
        </div>
        <button className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md bg-zinc-100 px-3 text-sm font-medium text-zinc-950">
          <WalletCards size={16} />
          Ghi giao dịch
        </button>
      </Panel>
      <Panel title="Giao dịch">
        <div className="space-y-2">
          {finance.length ? (
            finance.map((item) => (
              <div className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 p-3" key={item.ID}>
                <div>
                  <p className="text-sm font-medium text-white">{item.Description || item.Category}</p>
                  <p className="mt-1 text-xs text-zinc-500">{item.Date} · {item.Type}</p>
                </div>
                <span className={item.Type === 'income' ? 'text-emerald-300' : 'text-rose-300'}>
                  {formatMoney(item.Amount)} VND
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

function AutomationView({ source }: { source: string }) {
  return (
    <section className="grid gap-3 md:grid-cols-3">
      {[
        ['Telegram Webhook', 'Tạo task, note, tài chính', 'Online'],
        ['Morning report', 'Tóm tắt 08:00', 'Ready'],
        ['Reminder scan', 'Quét nhắc việc', 'Ready'],
      ].map(([title, description, status]) => (
        <div className="rounded-md border border-white/10 bg-white/[0.055] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.16)]" key={title}>
          <div className="flex items-center justify-between">
            <span className="grid size-10 place-items-center rounded-md border border-emerald-400/20 bg-emerald-400/10 text-emerald-200">
              <Bot size={18} />
            </span>
            <span className="rounded border border-white/10 bg-black/20 px-2 py-1 text-xs text-zinc-300">
              {status}
            </span>
          </div>
          <h3 className="mt-4 font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
        </div>
      ))}
      <div className="rounded-md border border-white/10 bg-white/[0.055] p-4 md:col-span-3">
        <p className="text-sm text-zinc-400">Nguồn: {source}</p>
      </div>
    </section>
  )
}

function QuickAddSheet({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean
  onClose: () => void
  onCreate: (draft: TaskDraft) => void
}) {
  const [draft, setDraft] = useState<TaskDraft>({
    dueAt: '',
    note: '',
    priority: 'P2',
    project: '',
    title: '',
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.title.trim()) return
    onCreate(draft)
    setDraft({
      dueAt: '',
      note: '',
      priority: 'P2',
      project: '',
      title: '',
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/60 p-2 backdrop-blur-md md:items-center md:justify-center">
      <form
        className="w-full rounded-xl border border-white/10 bg-white/[0.075] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl md:max-w-lg"
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-300">Ghi nhanh</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Thêm việc mới</h3>
          </div>
          <button
            className="grid size-9 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X size={17} />
          </button>
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Việc cần làm</span>
          <input
            autoFocus
            className="mt-2 min-h-12 w-full rounded-md border border-white/10 bg-black/20 px-3 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-300"
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="Ví dụ: Gọi khách xác nhận bản vẽ"
            value={draft.title}
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Dự án</span>
            <input
              className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-300"
              onChange={(event) => setDraft((current) => ({ ...current, project: event.target.value }))}
              placeholder="Personal OS"
              value={draft.project}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Ưu tiên</span>
            <select
              className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-emerald-300"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  priority: event.target.value as Task['Priority'],
                }))
              }
              value={draft.priority}
            >
              <option value="P1">P1 - Gấp</option>
              <option value="P2">P2 - Quan trọng</option>
              <option value="P3">P3 - Bình thường</option>
            </select>
          </label>
        </div>

        <label className="mt-3 block">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Hạn xử lý</span>
          <input
            className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-emerald-300"
            onChange={(event) => setDraft((current) => ({ ...current, dueAt: event.target.value }))}
            type="datetime-local"
            value={draft.dueAt}
          />
        </label>

        <label className="mt-3 block">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Ghi chú</span>
          <textarea
            className="mt-2 min-h-20 w-full resize-none rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-300"
            onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
            placeholder="Thông tin thêm nếu cần"
            value={draft.note}
          />
        </label>

        <div className="mt-4 grid grid-cols-[1fr_1.4fr] gap-2">
          <button
            className="min-h-11 rounded-md border border-white/10 bg-white/[0.035] text-sm font-medium text-zinc-300"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
          <button
            className="min-h-11 rounded-md bg-white text-sm font-bold text-zinc-950 shadow-[0_16px_45px_rgba(255,255,255,0.12)] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!draft.title.trim()}
            type="submit"
          >
            Tạo việc
          </button>
        </div>
      </form>
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
    <section className="overflow-hidden rounded-md border border-white/10 bg-white/[0.055] shadow-[0_24px_80px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
      <div className="flex min-h-12 items-center justify-between border-b border-white/10 px-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {action ? (
          <button
            className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-100"
            onClick={onAction}
            type="button"
          >
            {action}
            <ArrowUpRight size={13} />
          </button>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function EmptyState({ body, title }: { body: string; title: string }) {
  return (
    <div className="rounded-md border border-dashed border-white/15 bg-white/[0.04] p-5 backdrop-blur">
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
    <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-6 rounded-xl border border-white/10 bg-white/[0.075] p-1 shadow-2xl shadow-black/60 backdrop-blur-2xl lg:hidden">
      {views.map(({ id, label, icon: Icon }) => (
        <button
          className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[10px] transition ${
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
