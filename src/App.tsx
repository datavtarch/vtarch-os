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
  Search,
  Send,
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
  { day: 'Mon', done: 3 },
  { day: 'Tue', done: 5 },
  { day: 'Wed', done: 4 },
  { day: 'Thu', done: 7 },
  { day: 'Fri', done: 6 },
  { day: 'Sat', done: 2 },
  { day: 'Sun', done: 4 },
]

const stack = [
  'React',
  'Vite',
  'Tailwind',
  'shadcn/ui',
  'TanStack Table',
  'Recharts',
  'cmdk',
  'Sonner',
  'Motion',
  'dnd-kit',
  'FullCalendar',
  'Google Apps Script',
  'Telegram Bot API',
]

function App() {
  const [dashboard, setDashboard] = useState<DashboardData>(mockDashboardData)
  const [source, setSource] = useState('mock data')

  useEffect(() => {
    getDashboardData()
      .then((data) => {
        setDashboard(data)
        setSource(import.meta.env.VITE_APPS_SCRIPT_URL ? 'Google Sheets' : 'mock data')
      })
      .catch(() => {
        setDashboard(mockDashboardData)
        setSource('mock data')
      })
  }, [])

  const columns = useMemo<ColumnDef<Task>[]>(
    () => [
      {
        accessorKey: 'Title',
        header: 'Task',
      },
      {
        accessorKey: 'Status',
        header: 'Status',
      },
      {
        accessorKey: 'Priority',
        header: 'Priority',
      },
      {
        accessorKey: 'Project',
        header: 'Project',
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

  return (
    <main className="min-h-screen bg-[#f6f3ec] text-[#1d1f1c]">
      <section className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-6 px-5 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-lg border border-[#d8d1c3] bg-[#fffaf0] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-md bg-[#143c36] text-[#f5ead5]">
              <Send size={20} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#7c725f]">
                VTARCH OS
              </p>
              <h1 className="text-xl font-semibold">VTARCH OS</h1>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 rounded-md border border-[#d8d1c3] bg-white px-3 py-2 text-sm text-[#7c725f]">
            <Search size={16} />
            <span>Search task, note, money...</span>
            <kbd className="ml-auto rounded border px-1.5 text-[11px]">Ctrl K</kbd>
          </div>

          <nav className="mt-6 space-y-2 text-sm">
            {[
              ['Today', CheckCircle2],
              ['Reminder', Bell],
              ['Notes', NotebookText],
              ['Finance', CreditCard],
              ['Calendar', CalendarDays],
              ['Kanban', KanbanSquare],
            ].map(([label, Icon]) => (
              <button
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[#4f4a40] hover:bg-[#efe7d6]"
                key={label as string}
                type="button"
              >
                <Icon size={17} />
                {label as string}
              </button>
            ))}
          </nav>
        </aside>

        <div className="space-y-6">
          <header className="rounded-lg border border-[#d8d1c3] bg-[#143c36] p-6 text-[#fffaf0] shadow-sm">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-[#cbbf9d]">
                  Telegram + Sheets + Dashboard
                </p>
                <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight md:text-5xl">
                  Your personal operating system is ready.
                </h2>
                <p className="mt-4 max-w-xl text-sm text-[#d7c9a5]">
                  Data source: {source}. Add your Apps Script URL in
                  .env to switch this dashboard to live Google Sheets.
                </p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-md bg-[#f0b35b] px-4 py-2 text-sm font-semibold text-[#1d1f1c]">
                <Command size={17} />
                Command ready
              </button>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-4">
            {[
              ['Today', `${dashboard.metrics.todayTasks} tasks`, 'open now'],
              ['Overdue', `${dashboard.metrics.overdueTasks} tasks`, 'needs review'],
              ['Finance', `${expenseLabel} VND`, 'spent this week'],
              ['Notes', `${dashboard.metrics.notes} items`, 'searchable'],
            ].map(([title, value, meta]) => (
              <div
                className="rounded-lg border border-[#d8d1c3] bg-white p-4 shadow-sm"
                key={title}
              >
                <p className="text-sm text-[#7c725f]">{title}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#9b8970]">
                  {meta}
                </p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <div className="rounded-lg border border-[#d8d1c3] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Weekly momentum</h3>
                  <p className="text-sm text-[#7c725f]">
                    Recharts is wired and ready for productivity analytics.
                  </p>
                </div>
                <span className="rounded-md bg-[#e7f0df] px-3 py-1 text-sm text-[#315c38]">
                  +18%
                </span>
              </div>
              <div className="mt-6 h-72">
                <ResponsiveContainer height="100%" width="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="done" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#143c36" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#143c36" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#eee5d3" vertical={false} />
                    <XAxis dataKey="day" tickLine={false} />
                    <Tooltip />
                    <Area
                      dataKey="done"
                      fill="url(#done)"
                      stroke="#143c36"
                      strokeWidth={3}
                      type="monotone"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border border-[#d8d1c3] bg-[#fffaf0] p-5 shadow-sm">
              <h3 className="text-lg font-semibold">Installed stack</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {stack.map((item) => (
                  <span
                    className="rounded-md border border-[#d8d1c3] bg-white px-2.5 py-1 text-sm text-[#4f4a40]"
                    key={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[#d8d1c3] bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <h3 className="text-lg font-semibold">Task table</h3>
                <p className="text-sm text-[#7c725f]">
                  TanStack Table is wired for sorting, filtering, grouping, and bulk actions.
                </p>
              </div>
              <span className="rounded-md bg-[#efe7d6] px-3 py-1 text-sm text-[#4f4a40]">
                {dashboard.tasks.length} rows
              </span>
            </div>

            <div className="mt-5 overflow-hidden rounded-md border border-[#d8d1c3]">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-[#fffaf0] text-xs uppercase tracking-[0.14em] text-[#7c725f]">
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
                    <tr className="border-t border-[#eee5d3]" key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <td className="px-4 py-3 text-[#4f4a40]" key={cell.id}>
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
