import { useEffect, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  Bell,
  Bot,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  CreditCard,
  DatabaseZap,
  Filter,
  MoreHorizontal,
  NotebookText,
  PanelLeft,
  Plus,
  Search,
  Send,
  Sparkles,
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

const chartData = [
  { day: 'T2', done: 3 },
  { day: 'T3', done: 5 },
  { day: 'T4', done: 4 },
  { day: 'T5', done: 7 },
  { day: 'T6', done: 6 },
  { day: 'T7', done: 2 },
  { day: 'CN', done: 4 },
]

const navItems = [
  ['Tổng quan', PanelLeft],
  ['Công việc', CheckCircle2],
  ['Lịch', CalendarDays],
  ['Ghi chú', NotebookText],
  ['Tài chính', CreditCard],
  ['Tự động hóa', Bot],
] as const

const quickActions: Array<[string, string, LucideIcon]> = [
  ['Tạo việc', 'Ghi nhanh một task từ Telegram hoặc web', Plus],
  ['Nhắc việc', 'Đặt giờ nhắc và báo qua bot', Bell],
  ['Ghi chi tiêu', 'Lưu khoản chi vào Google Sheets', WalletCards],
]

const statusLabels: Record<Task['Status'], string> = {
  Inbox: 'Mới',
  Doing: 'Đang làm',
  Waiting: 'Đang chờ',
  Done: 'Hoàn thành',
  Cancelled: 'Đã hủy',
}

const statusStyles: Record<Task['Status'], string> = {
  Inbox: 'border-sky-300/25 bg-sky-300/10 text-sky-100',
  Doing: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
  Waiting: 'border-violet-300/25 bg-violet-300/10 text-violet-100',
  Done: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100',
  Cancelled: 'border-slate-300/20 bg-slate-300/10 text-slate-300',
}

const priorityStyles: Record<Task['Priority'], string> = {
  P1: 'bg-rose-400/15 text-rose-100 ring-rose-300/20',
  P2: 'bg-amber-400/15 text-amber-100 ring-amber-300/20',
  P3: 'bg-slate-400/15 text-slate-200 ring-slate-300/20',
}

function formatShortDate(value?: string) {
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

function App() {
  const [dashboard, setDashboard] = useState<DashboardData>(mockDashboardData)
  const [source, setSource] = useState('dữ liệu mẫu')

  useEffect(() => {
    getDashboardData()
      .then((data) => {
        setDashboard(data)
        setSource(import.meta.env.VITE_APPS_SCRIPT_URL ? 'Google Sheets' : 'dữ liệu mẫu')
      })
      .catch(() => {
        setDashboard(mockDashboardData)
        setSource('dữ liệu mẫu')
      })
  }, [])

  const openTasks = useMemo(
    () =>
      dashboard.tasks.filter(
        (task) => task.Status !== 'Done' && task.Status !== 'Cancelled',
      ),
    [dashboard.tasks],
  )

  const columns = useMemo<ColumnDef<Task>[]>(
    () => [
      {
        accessorKey: 'Title',
        header: 'Công việc',
        cell: ({ row }) => (
          <div className="min-w-[260px]">
            <div className="flex items-center gap-2">
              {row.original.Status === 'Done' ? (
                <Check className="text-emerald-300" size={16} />
              ) : (
                <Circle className="text-slate-500" size={16} />
              )}
              <span className="font-medium text-white">{row.original.Title}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-2 pl-6 text-xs text-slate-400">
              <span>{row.original.ID}</span>
              <span>{row.original.Project || 'Không có dự án'}</span>
              <span>{formatShortDate(row.original.DueAt)}</span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'Status',
        header: 'Trạng thái',
        cell: ({ getValue }) => {
          const status = getValue() as Task['Status']
          return (
            <span className={`rounded-full border px-2.5 py-1 text-xs ${statusStyles[status]}`}>
              {statusLabels[status]}
            </span>
          )
        },
      },
      {
        accessorKey: 'Priority',
        header: 'Ưu tiên',
        cell: ({ getValue }) => {
          const priority = getValue() as Task['Priority']
          return (
            <span className={`rounded-full px-2 py-1 text-xs ring-1 ${priorityStyles[priority]}`}>
              {priority}
            </span>
          )
        },
      },
      {
        accessorKey: 'Source',
        header: 'Nguồn',
        cell: ({ getValue }) => (
          <span className="text-sm text-slate-300">{String(getValue() || 'Web')}</span>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: dashboard.tasks,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const expenseLabel = new Intl.NumberFormat('vi-VN').format(
    dashboard.metrics.weeklyExpense,
  )

  const focusTask = openTasks[0]
  const latestNote = dashboard.notes[0]
  const latestFinance = dashboard.finance[0]
  const doneCount = dashboard.tasks.filter((task) => task.Status === 'Done').length

  const board = [
    ['Mới', dashboard.tasks.filter((task) => task.Status === 'Inbox').length, 'bg-sky-300'],
    ['Đang làm', dashboard.tasks.filter((task) => task.Status === 'Doing').length, 'bg-amber-300'],
    ['Đang chờ', dashboard.tasks.filter((task) => task.Status === 'Waiting').length, 'bg-violet-300'],
    ['Xong', doneCount, 'bg-emerald-300'],
  ] as const

  const metrics: Array<[string, string | number, string, LucideIcon]> = [
    ['Cần xử lý', dashboard.metrics.todayTasks, 'việc đang mở', CheckCircle2],
    ['Quá hạn', dashboard.metrics.overdueTasks, 'cần xem lại', Bell],
    ['Chi tuần này', expenseLabel, 'VND', TrendingUp],
    ['Ghi chú', dashboard.metrics.notes, 'mục đã lưu', NotebookText],
  ]

  return (
    <main className="min-h-screen bg-[#080b12] text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(120deg,rgba(34,211,238,0.13),transparent_30%,rgba(132,204,22,0.08)_62%,transparent),linear-gradient(rgba(255,255,255,0.032)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.032)_1px,transparent_1px)] bg-[size:100%_100%,64px_64px,64px_64px]" />

      <div className="mx-auto grid min-h-screen max-w-[1500px] grid-cols-1 gap-4 p-3 lg:grid-cols-[260px_1fr] lg:p-4">
        <aside className="rounded-lg border border-white/10 bg-[#0d121c]/85 p-4 shadow-2xl shadow-black/35 backdrop-blur-xl lg:sticky lg:top-4 lg:h-[calc(100vh-32px)]">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/40">
              <Send size={19} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/70">
                Workspace
              </p>
              <h1 className="text-lg font-semibold tracking-tight">VTARCH OS</h1>
            </div>
          </div>

          <button className="mt-5 flex min-h-11 w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-left text-sm text-slate-300 shadow-inner shadow-black/25">
            <Search size={16} />
            <span className="min-w-0 flex-1 truncate">Tìm task, note, chi tiêu...</span>
            <kbd className="rounded-md bg-white/10 px-1.5 text-[11px] text-slate-400">
              ⌘K
            </kbd>
          </button>

          <nav className="mt-5 space-y-1">
            {navItems.map(([label, Icon], index) => (
              <button
                className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition ${
                  index === 0
                    ? 'bg-cyan-300/12 text-cyan-50 ring-1 ring-cyan-300/25'
                    : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
                }`}
                key={label}
                type="button"
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">Trạng thái hệ thống</span>
              <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.8)]" />
            </div>
            <div className="mt-3 space-y-2 text-xs text-slate-400">
              <div className="flex items-center justify-between">
                <span>Google Sheets</span>
                <span className="text-emerald-200">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Telegram Bot</span>
                <span className="text-emerald-200">Sẵn sàng</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Nguồn</span>
                <span className="text-cyan-200">{source}</span>
              </div>
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          <header className="rounded-lg border border-white/10 bg-[#0d121c]/85 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-200/75">
                  <DatabaseZap size={15} />
                  Live personal command center
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-4xl">
                  Điều hành công việc, tiền bạc và nhắc việc trong một màn hình.
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm text-slate-200">
                  <Filter size={16} />
                  Bộ lọc
                </button>
                <button className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#d9f99d] px-3 text-sm font-semibold text-slate-950 shadow-lg shadow-lime-950/30">
                  <Plus size={16} />
                  Thêm nhanh
                </button>
              </div>
            </div>
          </header>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map(([title, value, meta, Icon]) => (
              <div
                className="rounded-lg border border-white/10 bg-white/[0.065] p-4 shadow-xl shadow-black/20 backdrop-blur-xl"
                key={title}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">{title}</p>
                  <Icon className="text-cyan-200/80" size={18} />
                </div>
                <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                  {meta}
                </p>
              </div>
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.45fr_0.9fr]">
            <div className="rounded-lg border border-white/10 bg-[#0d121c]/85 shadow-xl shadow-black/25 backdrop-blur-xl">
              <div className="flex flex-col gap-3 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">Inbox công việc</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Công việc từ Telegram, Google Sheets và thao tác web.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-lg bg-white/[0.06] px-3 py-2 text-sm text-slate-300">
                    Tất cả
                  </button>
                  <button className="rounded-lg bg-cyan-300/12 px-3 py-2 text-sm text-cyan-100">
                    Đang mở
                  </button>
                </div>
              </div>

              {dashboard.tasks.length ? (
                <>
                <div className="space-y-3 p-4 md:hidden">
                  {dashboard.tasks.map((task) => (
                    <div
                      className="rounded-lg border border-white/10 bg-black/20 p-4"
                      key={task.ID}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium leading-6 text-white">{task.Title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {task.ID} · {task.Project || 'Không có dự án'}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-xs ring-1 ${priorityStyles[task.Priority]}`}>
                          {task.Priority}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-xs ${statusStyles[task.Status]}`}>
                          {statusLabels[task.Status]}
                        </span>
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-300">
                          {formatShortDate(task.DueAt)}
                        </span>
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-300">
                          {task.Source || 'Web'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                    <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.12em] text-slate-500">
                      {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <th className="px-4 py-3 font-medium" key={header.id}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext(),
                                  )}
                            </th>
                          ))}
                          <th className="px-4 py-3" />
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {table.getRowModel().rows.map((row) => (
                        <tr
                          className="border-t border-white/8 transition hover:bg-white/[0.045]"
                          key={row.id}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td className="px-4 py-3 align-top" key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-right">
                            <button className="rounded-lg p-2 text-slate-500 hover:bg-white/10 hover:text-white">
                              <MoreHorizontal size={17} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              ) : (
                <div className="p-6">
                  <div className="rounded-lg border border-dashed border-cyan-300/25 bg-cyan-300/[0.04] p-5">
                    <h4 className="font-semibold text-white">Chưa có công việc trong Google Sheets</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Gửi một tin nhắn cho Telegram bot hoặc thêm dòng vào sheet Tasks, dashboard sẽ tự cập nhật tại đây.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="rounded-full bg-white/10 px-3 py-1">/today</span>
                      <span className="rounded-full bg-white/10 px-3 py-1">/note ý tưởng mới</span>
                      <span className="rounded-full bg-white/10 px-3 py-1">P1 gọi khách #sales</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-[#0d121c]/85 p-4 shadow-xl shadow-black/25 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Việc ưu tiên</h3>
                  <CalendarClock className="text-amber-200" size={18} />
                </div>
                {focusTask ? (
                  <div className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{focusTask.Title}</p>
                        <p className="mt-2 text-sm text-slate-400">
                          {focusTask.Project || 'Không có dự án'} · {formatShortDate(focusTask.DueAt)}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs ring-1 ${priorityStyles[focusTask.Priority]}`}>
                        {focusTask.Priority}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
                    Không có việc mở. Hệ thống đang sạch.
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-white/10 bg-[#0d121c]/85 p-4 shadow-xl shadow-black/25 backdrop-blur-xl">
                <h3 className="text-lg font-semibold text-white">Bảng trạng thái</h3>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {board.map(([label, count, dot]) => (
                    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3" key={label}>
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${dot}`} />
                        <span className="text-sm text-slate-300">{label}</span>
                      </div>
                      <p className="mt-2 text-2xl font-semibold text-white">{count}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_1fr_0.85fr]">
            <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-xl shadow-black/20 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-cyan-200" size={18} />
                <h3 className="font-semibold text-white">Nhịp làm việc</h3>
              </div>
              <div className="mt-4 h-48">
                <ResponsiveContainer height="100%" width="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="done" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#67e8f9" stopOpacity={0.58} />
                        <stop offset="95%" stopColor="#67e8f9" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis
                      axisLine={false}
                      dataKey="day"
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(10, 14, 23, 0.94)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 8,
                        color: '#eef7ff',
                      }}
                    />
                    <Area
                      dataKey="done"
                      fill="url(#done)"
                      stroke="#67e8f9"
                      strokeWidth={3}
                      type="monotone"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-xl shadow-black/20 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <NotebookText className="text-violet-200" size={18} />
                <h3 className="font-semibold text-white">Ghi chú gần nhất</h3>
              </div>
              <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4">
                <p className="text-sm leading-6 text-slate-300">
                  {latestNote?.Content || 'Chưa có ghi chú. Dùng /note trên Telegram để lưu nhanh ý tưởng.'}
                </p>
                <p className="mt-3 text-xs uppercase tracking-[0.14em] text-slate-500">
                  {latestNote?.Project || 'Quick capture'}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-xl shadow-black/20 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <Sparkles className="text-lime-200" size={18} />
                <h3 className="font-semibold text-white">Quick actions</h3>
              </div>
              <div className="mt-4 space-y-2">
                {quickActions.map(([title, description, Icon]) => (
                  <button
                    className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-3 text-left transition hover:bg-white/[0.08]"
                    key={title}
                    type="button"
                  >
                    <Icon className="text-cyan-200" size={17} />
                    <span>
                      <span className="block text-sm font-medium text-white">{title}</span>
                      <span className="block text-xs text-slate-500">{description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-[#0d121c]/85 p-4 shadow-xl shadow-black/25 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Tài chính</h3>
                <span className="rounded-full bg-emerald-300/10 px-2.5 py-1 text-xs text-emerald-100">
                  {dashboard.finance.length} giao dịch
                </span>
              </div>
              <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-slate-400">Gần nhất</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {latestFinance
                    ? `${new Intl.NumberFormat('vi-VN').format(latestFinance.Amount)} VND`
                    : 'Chưa có giao dịch'}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {latestFinance?.Description || 'Gửi /chi hoặc /thu qua Telegram để ghi nhanh.'}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#0d121c]/85 p-4 shadow-xl shadow-black/25 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Automation</h3>
                <span className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-xs text-cyan-100">
                  Active
                </span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {[
                  ['Webhook', 'Nhận tin từ Telegram'],
                  ['Morning report', 'Báo cáo 08:00'],
                  ['Reminder scan', 'Quét nhắc việc'],
                ].map(([title, description]) => (
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3" key={title}>
                    <p className="text-sm font-medium text-white">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  )
}

export default App
