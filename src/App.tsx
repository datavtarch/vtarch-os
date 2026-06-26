import { useEffect, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Command,
  CreditCard,
  KanbanSquare,
  NotebookText,
  Radio,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
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

const stack = [
  'React',
  'Vite',
  'Tailwind',
  'TanStack Table',
  'Recharts',
  'Motion',
  'dnd-kit',
  'FullCalendar',
  'Google Apps Script',
  'Telegram Bot API',
]

const navItems = [
  ['Hôm nay', CheckCircle2],
  ['Nhắc việc', Bell],
  ['Ghi chú', NotebookText],
  ['Tài chính', CreditCard],
  ['Lịch', CalendarDays],
  ['Bảng việc', KanbanSquare],
] as const

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

  const columns = useMemo<ColumnDef<Task>[]>(
    () => [
      {
        accessorKey: 'Title',
        header: 'Công việc',
      },
      {
        accessorKey: 'Status',
        header: 'Trạng thái',
        cell: ({ getValue }) => {
          const status = String(getValue())
          const labels: Record<string, string> = {
            Inbox: 'Mới',
            Doing: 'Đang làm',
            Waiting: 'Đang chờ',
            Done: 'Hoàn thành',
            Cancelled: 'Đã hủy',
          }
          return labels[status] || status
        },
      },
      {
        accessorKey: 'Priority',
        header: 'Ưu tiên',
      },
      {
        accessorKey: 'Project',
        header: 'Dự án',
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

  const stats = [
    ['Hôm nay', `${dashboard.metrics.todayTasks} việc`, 'đang mở', 'cyan'],
    ['Quá hạn', `${dashboard.metrics.overdueTasks} việc`, 'cần xem lại', 'amber'],
    ['Tài chính', `${expenseLabel} VND`, 'đã chi tuần này', 'emerald'],
    ['Ghi chú', `${dashboard.metrics.notes} mục`, 'có thể tìm kiếm', 'violet'],
  ]

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07090f] text-[#eef7ff]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(45,212,191,0.14),transparent_24%,rgba(244,114,182,0.10)_50%,transparent_72%,rgba(251,191,36,0.12)),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:100%_100%,72px_72px,72px_72px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/10 to-transparent" />

      <section className="relative mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-lg border border-white/12 bg-white/[0.075] p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl lg:sticky lg:top-5 lg:h-[calc(100vh-40px)]">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-lg border border-cyan-300/30 bg-cyan-300/15 text-cyan-100 shadow-lg shadow-cyan-950/30">
              <Send size={20} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/65">
                Personal OS
              </p>
              <h1 className="text-xl font-semibold tracking-tight">VTARCH OS</h1>
            </div>
          </div>

          <div className="mt-6 flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-slate-200/75 shadow-inner shadow-black/30">
            <Search size={16} />
            <span className="min-w-0 flex-1 truncate">
              Tìm công việc, ghi chú, tài chính...
            </span>
            <kbd className="rounded-md border border-white/10 bg-white/10 px-1.5 text-[11px] text-slate-200/70">
              Ctrl K
            </kbd>
          </div>

          <nav className="mt-6 space-y-1.5 text-sm">
            {navItems.map(([label, Icon], index) => (
              <button
                className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left transition duration-200 ${
                  index === 0
                    ? 'border border-cyan-300/25 bg-cyan-300/12 text-cyan-50 shadow-lg shadow-cyan-950/20'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
                key={label}
                type="button"
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-6 rounded-lg border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-100">
              <ShieldCheck size={16} />
              Đồng bộ an toàn
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-300/70">
              Telegram, Google Sheets và dashboard đang dùng cùng một nguồn dữ liệu.
            </p>
          </div>
        </aside>

        <div className="space-y-5">
          <header className="overflow-hidden rounded-lg border border-white/12 bg-white/[0.085] p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-cyan-100">
                  <Radio size={14} />
                  Telegram + Google Sheets + Bảng điều khiển
                </div>
                <h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-white md:text-6xl">
                  VTARCH OS đã sẵn sàng.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                  Nguồn dữ liệu: <span className="text-cyan-100">{source}</span>.
                  Bảng điều khiển đang đọc trực tiếp từ Google Sheets và Telegram bot.
                </p>
              </div>
              <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#d9f99d] px-4 text-sm font-semibold text-[#10150d] shadow-lg shadow-lime-950/30 transition hover:-translate-y-0.5 hover:bg-[#ecfccb]">
                <Command size={17} />
                Sẵn sàng nhập lệnh
              </button>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-4">
            {stats.map(([title, value, meta, tone]) => (
              <div
                className="rounded-lg border border-white/12 bg-white/[0.075] p-4 shadow-xl shadow-black/20 backdrop-blur-xl"
                key={title}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-300">{title}</p>
                  <span
                    className={`size-2 rounded-full ${
                      tone === 'cyan'
                        ? 'bg-cyan-300'
                        : tone === 'amber'
                          ? 'bg-amber-300'
                          : tone === 'emerald'
                            ? 'bg-emerald-300'
                            : 'bg-violet-300'
                    }`}
                  />
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
                  {value}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">
                  {meta}
                </p>
              </div>
            ))}
          </section>

          <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <div className="rounded-lg border border-white/12 bg-white/[0.075] p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Hiệu suất trong tuần
                  </h3>
                  <p className="mt-1 text-sm text-slate-300">
                    Theo dõi nhiệm vụ hoàn thành, việc còn lại và xu hướng năng suất.
                  </p>
                </div>
                <span className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-sm text-emerald-100">
                  +18%
                </span>
              </div>
              <div className="mt-6 h-72">
                <ResponsiveContainer height="100%" width="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="done" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#67e8f9" stopOpacity={0.55} />
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
                        background: 'rgba(7, 9, 15, 0.88)',
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

            <div className="rounded-lg border border-white/12 bg-white/[0.075] p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <Sparkles className="text-amber-200" size={18} />
                <h3 className="text-lg font-semibold text-white">Công nghệ đã cài</h3>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {stack.map((item) => (
                  <span
                    className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-sm text-slate-200"
                    key={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-white/12 bg-white/[0.075] p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Danh sách công việc
                </h3>
                <p className="mt-1 text-sm text-slate-300">
                  Dữ liệu được đồng bộ từ Google Sheets, sẵn sàng lọc, sắp xếp và thao tác hàng loạt.
                </p>
              </div>
              <span className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-sm text-slate-200">
                {dashboard.tasks.length} dòng
              </span>
            </div>

            <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="bg-white/10 text-xs uppercase tracking-[0.14em] text-slate-300">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th className="px-4 py-3 font-semibold" key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      className="border-t border-white/10 transition hover:bg-white/[0.06]"
                      key={row.id}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td className="px-4 py-3 text-slate-200" key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}

export default App
