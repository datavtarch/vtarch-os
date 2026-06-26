import { useEffect, useMemo, useState } from 'react'
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
  ListFilter,
  MoreHorizontal,
  NotebookText,
  Plus,
  Search,
  Send,
  Settings,
  TrendingUp,
  WalletCards,
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

  return (
    <main className="min-h-screen bg-[#090a0d] pb-20 text-zinc-100 lg:pb-0">
      <div className="mx-auto grid min-h-screen max-w-[1480px] grid-cols-1 lg:grid-cols-[252px_1fr]">
        <Sidebar activeView={activeView} setActiveView={setActiveView} source={source} />

        <section className="min-w-0 border-zinc-800/80 lg:border-l">
          <Topbar activeLabel={activeLabel} setActiveView={setActiveView} />

          <div className="p-3 md:p-5">
            {activeView === 'overview' && (
              <OverviewView
                board={board}
                metrics={metrics}
                selectedTask={selectedTask}
                setActiveView={setActiveView}
                setSelectedTaskId={setSelectedTaskId}
                tasks={dashboard.tasks}
              />
            )}
            {activeView === 'tasks' && (
              <TasksView
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
    <aside className="hidden bg-[#0c0d11] px-3 py-4 lg:block">
      <div className="flex items-center gap-3 px-2">
        <div className="grid size-9 place-items-center rounded-md bg-zinc-100 text-zinc-950">
          <Send size={17} />
        </div>
        <div>
          <p className="text-xs text-zinc-500">Personal workspace</p>
          <h1 className="text-sm font-semibold text-white">VTARCH OS</h1>
        </div>
      </div>

      <button className="mt-5 flex min-h-10 w-full items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-left text-sm text-zinc-400">
        <Search size={15} />
        <span className="flex-1 truncate">Tìm kiếm...</span>
        <span className="rounded border border-zinc-800 px-1.5 text-[10px]">Ctrl K</span>
      </button>

      <nav className="mt-5 space-y-1">
        {views.map(({ id, label, icon: Icon }) => (
          <button
            className={`flex min-h-9 w-full items-center gap-3 rounded-md px-2.5 text-left text-sm transition ${
              activeView === id
                ? 'bg-zinc-100 text-zinc-950'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
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

      <div className="mt-6 rounded-md border border-zinc-800 bg-zinc-950 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
            Sync
          </span>
          <span className="size-2 rounded-full bg-emerald-400" />
        </div>
        <p className="mt-3 text-sm text-zinc-300">{source}</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          Telegram bot và Google Sheets đang được dùng làm backend miễn phí.
        </p>
      </div>

      <button className="mt-3 flex min-h-9 w-full items-center justify-center gap-2 rounded-md border border-zinc-800 text-sm text-zinc-400">
        <Settings size={15} />
        Cài đặt
      </button>
    </aside>
  )
}

function Topbar({
  activeLabel,
  setActiveView,
}: {
  activeLabel: string
  setActiveView: (view: ViewId) => void
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-[#090a0d]/92 px-3 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.24)] backdrop-blur md:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">VTARCH OS</p>
          <h2 className="truncate text-lg font-semibold text-white">{activeLabel}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="hidden min-h-9 items-center gap-2 rounded-md border border-zinc-800 px-3 text-sm text-zinc-300 md:inline-flex">
            <ListFilter size={15} />
            Lọc
          </button>
          <button
            className="inline-flex min-h-9 items-center gap-2 rounded-md bg-zinc-100 px-3 text-sm font-medium text-zinc-950"
            onClick={() => setActiveView('tasks')}
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
            className="rounded-md px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
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
  selectedTask,
  setActiveView,
  setSelectedTaskId,
  tasks,
}: {
  board: ReadonlyArray<readonly [string, number, string]>
  metrics: ReadonlyArray<readonly [string, string | number, string, LucideIcon]>
  selectedTask?: Task
  setActiveView: (view: ViewId) => void
  setSelectedTaskId: (id: string) => void
  tasks: Task[]
}) {
  return (
    <div className="space-y-4">
      <FocusHero selectedTask={selectedTask} tasks={tasks} />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {metrics.map(([title, value, meta, Icon]) => (
          <div className="rounded-md border border-zinc-800 bg-[#0f1117] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.18)] md:p-4" key={title}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 md:text-sm md:normal-case md:tracking-normal">{title}</p>
              <Icon className="text-zinc-500" size={17} />
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-zinc-600">{meta}</p>
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
              <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3" key={label}>
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

function FocusHero({ selectedTask, tasks }: { selectedTask?: Task; tasks: Task[] }) {
  const todayCount = tasks.filter((task) => task.DueAt).length
  return (
    <section className="overflow-hidden rounded-md border border-zinc-800 bg-[#101218] shadow-[0_24px_80px_rgba(0,0,0,0.26)]">
      <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="border-b border-zinc-800 p-4 md:p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-200">
              Không gian làm việc
            </span>
            <span className="text-xs text-zinc-500">{todayCount} lịch hôm nay</span>
          </div>
          <h3 className="mt-5 max-w-2xl text-2xl font-semibold tracking-[-0.01em] text-white md:text-3xl">
            {selectedTask?.Title || 'Chọn việc quan trọng nhất để bắt đầu ngay.'}
          </h3>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
            VTARCH OS gom task, lịch, ghi chú, tài chính và automation vào một màn hình làm việc gọn.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
              {selectedTask?.Project || 'Personal OS'}
            </span>
            <span className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
              Hạn: {formatDate(selectedTask?.DueAt)}
            </span>
            <span className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
              {selectedTask?.Priority || 'P2'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-zinc-800 lg:grid-cols-1 lg:divide-x-0 lg:divide-y">
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
  selectedTask,
  setSelectedTaskId,
  tasks,
}: {
  selectedTask?: Task
  setSelectedTaskId: (id: string) => void
  tasks: Task[]
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <Panel title="Công việc" action="Thêm task">
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
        body="Gửi task qua Telegram hoặc thêm dòng vào Google Sheets để bắt đầu."
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
              ? 'border-zinc-600 bg-zinc-900/90'
              : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/55'
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

        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
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
  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <Panel title="Lịch tuần">
        <div className="grid grid-cols-7 gap-2 text-center text-xs text-zinc-500">
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
            <div className="rounded-md bg-zinc-950 py-2" key={day}>
              {day}
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {Array.from({ length: 28 }, (_, index) => (
            <div className="min-h-20 rounded-md border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-600" key={index}>
              {index + 1}
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Sắp tới">
        <div className="space-y-2">
          {tasks.length ? (
            tasks.slice(0, 5).map((task) => (
              <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3" key={task.ID}>
                <p className="text-sm font-medium text-white">{task.Title}</p>
                <p className="mt-1 text-xs text-zinc-500">{formatDate(task.DueAt)}</p>
              </div>
            ))
          ) : (
            <EmptyState body="Không có task cần nhắc trong dữ liệu hiện tại." title="Lịch trống" />
          )}
        </div>
      </Panel>
    </section>
  )
}

function NotesView({ notes }: { notes: DashboardData['notes'] }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {notes.length ? (
        notes.map((note) => (
          <article className="rounded-md border border-zinc-800 bg-[#0f1117] p-4" key={note.ID}>
            <p className="text-sm leading-6 text-zinc-300">{note.Content}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
              <span>{note.Project || 'Quick capture'}</span>
              <span>{note.Source}</span>
            </div>
          </article>
        ))
      ) : (
        <EmptyState body="Gửi /note qua Telegram để lưu nhanh ý tưởng." title="Chưa có ghi chú" />
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
  return (
    <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Panel title="Tổng quan">
        <p className="text-3xl font-semibold text-white">{expenseLabel} VND</p>
        <p className="mt-1 text-sm text-zinc-500">Chi tuần này</p>
        <button className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md bg-zinc-100 px-3 text-sm font-medium text-zinc-950">
          <WalletCards size={16} />
          Ghi giao dịch
        </button>
      </Panel>
      <Panel title="Giao dịch">
        <div className="space-y-2">
          {finance.length ? (
            finance.map((item) => (
              <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 p-3" key={item.ID}>
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
            <EmptyState body="Gửi /chi hoặc /thu qua Telegram để ghi nhanh giao dịch." title="Chưa có giao dịch" />
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
        ['Telegram Webhook', 'Nhận tin nhắn và tạo task/note/tài chính tự động', 'Online'],
        ['Morning report', 'Báo cáo công việc lúc 08:00 mỗi ngày', 'Ready'],
        ['Reminder scan', 'Quét nhắc việc và gửi thông báo Telegram', 'Ready'],
      ].map(([title, description, status]) => (
        <div className="rounded-md border border-zinc-800 bg-[#0f1117] p-4" key={title}>
          <div className="flex items-center justify-between">
            <Bot className="text-zinc-500" size={20} />
            <span className="rounded bg-emerald-400/10 px-2 py-1 text-xs text-emerald-300">
              {status}
            </span>
          </div>
          <h3 className="mt-4 font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
        </div>
      ))}
      <div className="rounded-md border border-zinc-800 bg-[#0f1117] p-4 md:col-span-3">
        <p className="text-sm text-zinc-400">Nguồn hiện tại: {source}</p>
      </div>
    </section>
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
    <section className="overflow-hidden rounded-md border border-zinc-800 bg-[#0f1117] shadow-[0_18px_50px_rgba(0,0,0,0.16)]">
      <div className="flex min-h-12 items-center justify-between border-b border-zinc-800 px-4">
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
    <div className="rounded-md border border-dashed border-zinc-700 bg-zinc-950 p-5">
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
    <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-6 rounded-xl border border-zinc-800 bg-[#0f1117]/96 p-1 shadow-2xl shadow-black/60 backdrop-blur lg:hidden">
      {views.map(({ id, label, icon: Icon }) => (
        <button
          className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[10px] transition ${
            activeView === id
              ? 'bg-zinc-100 text-zinc-950'
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
