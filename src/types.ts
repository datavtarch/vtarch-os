import { z } from 'zod'

export const taskSchema = z.object({
  ID: z.string(),
  Title: z.string(),
  Status: z.enum(['Inbox', 'Doing', 'Waiting', 'Done', 'Cancelled']),
  Priority: z.enum(['P1', 'P2', 'P3']),
  Project: z.string().optional().default(''),
  Tags: z.string().optional().default(''),
  DueAt: z.string().optional().default(''),
  RemindAt: z.string().optional().default(''),
  Note: z.string().optional().default(''),
  CreatedAt: z.string(),
  DoneAt: z.string().optional().default(''),
  Source: z.string().optional().default('Web'),
})

export const noteSchema = z.object({
  ID: z.string(),
  Content: z.string(),
  Type: z.string(),
  Tags: z.string().optional().default(''),
  Project: z.string().optional().default(''),
  LinkedTaskID: z.string().optional().default(''),
  FileURL: z.string().optional().default(''),
  CreatedAt: z.string(),
  Source: z.string().optional().default('Web'),
})

export const financeSchema = z.object({
  ID: z.string(),
  Date: z.string(),
  Type: z.enum(['income', 'expense', 'debt', 'transfer']),
  Amount: z.coerce.number(),
  Category: z.string(),
  Description: z.string(),
  Project: z.string().optional().default(''),
  PaymentMethod: z.string().optional().default(''),
  ReceiptURL: z.string().optional().default(''),
  CreatedAt: z.string(),
})

export const dashboardSchema = z.object({
  tasks: z.array(taskSchema),
  notes: z.array(noteSchema),
  finance: z.array(financeSchema),
  metrics: z.object({
    todayTasks: z.number(),
    overdueTasks: z.number(),
    weeklyExpense: z.number(),
    notes: z.number(),
  }),
})

export type Task = z.infer<typeof taskSchema>
export type DashboardData = z.infer<typeof dashboardSchema>
