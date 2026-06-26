const SHEETS = {
  Tasks: ['ID', 'Title', 'Status', 'Priority', 'Project', 'Tags', 'DueAt', 'RemindAt', 'Note', 'CreatedAt', 'DoneAt', 'Source'],
  Notes: ['ID', 'Content', 'Type', 'Tags', 'Project', 'LinkedTaskID', 'FileURL', 'CreatedAt', 'Source'],
  Finance: ['ID', 'Date', 'Type', 'Amount', 'Category', 'Description', 'Project', 'PaymentMethod', 'ReceiptURL', 'CreatedAt'],
  Reminders: ['ID', 'TaskID', 'RemindAt', 'RepeatRule', 'LastSentAt', 'SnoozeUntil', 'Enabled'],
  Projects: ['ID', 'Name', 'Goal', 'Status', 'Deadline', 'NextAction', 'CreatedAt'],
  Settings: ['Key', 'Value', 'Note'],
  Logs: ['Time', 'Action', 'Payload', 'Result'],
}

function setup() {
  const spreadsheet = SpreadsheetApp.getActive()
  Object.keys(SHEETS).forEach((name) => {
    const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name)
    const headers = SHEETS[name]
    sheet.clear()
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    sheet.setFrozenRows(1)
    sheet.autoResizeColumns(1, headers.length)
  })

  const settings = spreadsheet.getSheetByName('Settings')
  settings.getRange(2, 1, 5, 3).setValues([
    ['TELEGRAM_BOT_TOKEN', '', 'Set in Script Properties for better security'],
    ['TELEGRAM_ALLOWED_USER_ID', '', 'Only this Telegram user can control the bot'],
    ['TELEGRAM_CHAT_ID', '', 'Default chat for reports and reminders'],
    ['TIMEZONE', 'Asia/Bangkok', 'Timezone used for reminders'],
    ['MORNING_REPORT_TIME', '08:00', 'Daily planning message time'],
  ])

  return json({ ok: true, sheets: Object.keys(SHEETS) })
}

function doGet(event) {
  return handleRequest(event, 'GET')
}

function doPost(event) {
  return handleRequest(event, 'POST')
}

function handleRequest(event, method) {
  try {
    const body = event.postData && event.postData.contents ? JSON.parse(event.postData.contents) : {}
    const action = body.action || (event.parameter && event.parameter.action) || 'dashboard'

    if (body.update_id || body.message || body.callback_query) {
      return handleTelegramUpdate(body)
    }

    if (action === 'setup') return setup()
    if (action === 'dashboard') return json({ ok: true, data: getDashboardData() })
    if (action === 'createTask') return json({ ok: true, data: createTask(body.data || {}) })
    if (action === 'updateTaskStatus') return json({ ok: true, data: updateTaskStatus(body.id, body.status) })
    if (action === 'createNote') return json({ ok: true, data: createNote(body.data || {}) })
    if (action === 'createFinance') return json({ ok: true, data: createFinance(body.data || {}) })

    return json({ ok: false, error: `Unknown action: ${action}`, method })
  } catch (error) {
    logAction('error', { message: error.message, stack: error.stack }, 'failed')
    return json({ ok: false, error: error.message })
  }
}

function handleTelegramUpdate(update) {
  if (isDuplicateTelegramUpdate(update)) {
    return json({ ok: true, duplicate: true })
  }

  const message = update.message || {}
  const text = (message.text || '').trim()
  const userId = message.from && String(message.from.id)
  const chatId = message.chat && message.chat.id

  captureTelegramIdentity(userId, chatId)

  if (!isAllowedTelegramUser(userId)) {
    sendTelegramMessage(chatId, 'Bạn chưa được cấp quyền dùng bot này.')
    return json({ ok: true, ignored: true })
  }

  if (text.startsWith('/start')) {
    sendTelegramMessage(chatId, 'VTARCH OS đã sẵn sàng. Gửi task, /today, /note hoặc /chi để bắt đầu.')
    return json({ ok: true })
  }

  if (text.startsWith('/today')) {
    const tasks = getRows('Tasks').filter((task) => task.Status !== 'Done' && task.Status !== 'Cancelled')
    sendTelegramMessage(chatId, formatTaskList(tasks.slice(0, 10)))
    return json({ ok: true })
  }

  if (text.startsWith('/done')) {
    const id = text.split(/\s+/)[1]
    const task = updateTaskStatus(id, 'Done')
    sendTelegramMessage(chatId, task ? `Đã hoàn thành: ${task.Title}` : 'Không tìm thấy task.')
    return json({ ok: true })
  }

  if (text.startsWith('/note')) {
    const note = createNote({ Content: text.replace('/note', '').trim(), Type: 'text', Source: 'Telegram' })
    sendTelegramMessage(chatId, `Đã lưu note ${note.ID}.`)
    return json({ ok: true })
  }

  if (text.startsWith('/chi') || text.startsWith('/thu')) {
    const item = parseFinanceText(text)
    const finance = createFinance({ ...item, Source: 'Telegram' })
    sendTelegramMessage(chatId, `Đã lưu ${finance.Type}: ${finance.Amount} - ${finance.Description}`)
    return json({ ok: true })
  }

  const task = createTask(parseTaskText(text))
  sendTelegramMessage(chatId, `Đã tạo task ${task.ID}: ${task.Title}`)
  return json({ ok: true })
}

function isDuplicateTelegramUpdate(update) {
  if (!update.update_id) return false
  const cache = CacheService.getScriptCache()
  const key = `tg_update_${update.update_id}`
  if (cache.get(key)) return true
  cache.put(key, '1', 21600)
  return false
}

function captureTelegramIdentity(userId, chatId) {
  if (!userId && !chatId) return
  if (userId && !getSetting('TELEGRAM_ALLOWED_USER_ID')) {
    setSettingValue('TELEGRAM_ALLOWED_USER_ID', userId, 'Only this Telegram user can control the bot')
  }
  if (chatId && !getSetting('TELEGRAM_CHAT_ID')) {
    setSettingValue('TELEGRAM_CHAT_ID', String(chatId), 'Default chat for reports and reminders')
  }
}

function getDashboardData() {
  const tasks = getRows('Tasks')
  const notes = getRows('Notes')
  const finance = getRows('Finance')
  const openTasks = tasks.filter((task) => task.Status !== 'Done' && task.Status !== 'Cancelled')
  const overdue = openTasks.filter((task) => task.DueAt && new Date(task.DueAt) < new Date())
  const expense = finance
    .filter((item) => item.Type === 'expense')
    .reduce((sum, item) => sum + Number(item.Amount || 0), 0)

  return {
    tasks,
    notes,
    finance,
    metrics: {
      todayTasks: openTasks.length,
      overdueTasks: overdue.length,
      weeklyExpense: expense,
      notes: notes.length,
    },
  }
}

function createTask(data) {
  const row = {
    ID: data.ID || makeId('T'),
    Title: data.Title || data.title || 'Untitled task',
    Status: data.Status || 'Inbox',
    Priority: data.Priority || 'P2',
    Project: data.Project || '',
    Tags: asTags(data.Tags || data.tags),
    DueAt: data.DueAt || '',
    RemindAt: data.RemindAt || '',
    Note: data.Note || '',
    CreatedAt: data.CreatedAt || new Date().toISOString(),
    DoneAt: '',
    Source: data.Source || 'Web',
  }
  appendObject('Tasks', row)
  logAction('createTask', row, 'ok')
  return row
}

function createNote(data) {
  const row = {
    ID: data.ID || makeId('N'),
    Content: data.Content || data.content || '',
    Type: data.Type || 'text',
    Tags: asTags(data.Tags || data.tags),
    Project: data.Project || '',
    LinkedTaskID: data.LinkedTaskID || '',
    FileURL: data.FileURL || '',
    CreatedAt: data.CreatedAt || new Date().toISOString(),
    Source: data.Source || 'Web',
  }
  appendObject('Notes', row)
  logAction('createNote', row, 'ok')
  return row
}

function createFinance(data) {
  const row = {
    ID: data.ID || makeId('F'),
    Date: data.Date || new Date().toISOString().slice(0, 10),
    Type: data.Type || 'expense',
    Amount: data.Amount || 0,
    Category: data.Category || 'general',
    Description: data.Description || '',
    Project: data.Project || '',
    PaymentMethod: data.PaymentMethod || '',
    ReceiptURL: data.ReceiptURL || '',
    CreatedAt: data.CreatedAt || new Date().toISOString(),
  }
  appendObject('Finance', row)
  logAction('createFinance', row, 'ok')
  return row
}

function updateTaskStatus(id, status) {
  if (!id) return null
  const sheet = getSheet('Tasks')
  const values = sheet.getDataRange().getValues()
  const headers = values[0]
  const idIndex = headers.indexOf('ID')
  const statusIndex = headers.indexOf('Status')
  const doneAtIndex = headers.indexOf('DoneAt')

  for (let i = 1; i < values.length; i += 1) {
    if (String(values[i][idIndex]) === String(id)) {
      sheet.getRange(i + 1, statusIndex + 1).setValue(status)
      if (status === 'Done') sheet.getRange(i + 1, doneAtIndex + 1).setValue(new Date().toISOString())
      return getRows('Tasks').find((task) => String(task.ID) === String(id))
    }
  }
  return null
}

function checkReminders() {
  const now = new Date()
  const reminders = getRows('Reminders').filter((item) => String(item.Enabled).toUpperCase() !== 'FALSE')
  reminders.forEach((reminder) => {
    if (!reminder.RemindAt || new Date(reminder.RemindAt) > now) return
    if (reminder.LastSentAt) return
    const task = getRows('Tasks').find((item) => item.ID === reminder.TaskID)
    const chatId = getSetting('TELEGRAM_CHAT_ID')
    if (task && chatId) sendTelegramMessage(chatId, `Nhắc việc: ${task.Title}`)
  })
}

function parseTaskText(text) {
  const tags = (text.match(/#[\p{L}\p{N}_-]+/gu) || []).map((tag) => tag.replace('#', ''))
  const priorityMatch = text.match(/\bP[123]\b/i)
  const cleanTitle = text.replace(/#[\p{L}\p{N}_-]+/gu, '').replace(/\bP[123]\b/i, '').trim()
  return {
    Title: cleanTitle || text,
    Priority: priorityMatch ? priorityMatch[0].toUpperCase() : 'P2',
    Tags: tags.join(', '),
    Source: 'Telegram',
  }
}

function parseFinanceText(text) {
  const type = text.startsWith('/thu') ? 'income' : 'expense'
  const amountMatch = text.match(/(\d+(?:[.,]\d+)?)(k|tr|m|triệu)?/i)
  const rawAmount = amountMatch ? Number(amountMatch[1].replace(',', '.')) : 0
  const unit = amountMatch && amountMatch[2] ? amountMatch[2].toLowerCase() : ''
  const multiplier = unit === 'k' ? 1000 : unit === 'tr' || unit === 'm' || unit === 'triệu' ? 1000000 : 1
  return {
    Type: type,
    Amount: rawAmount * multiplier,
    Category: ((text.match(/#[\p{L}\p{N}_-]+/u) || ['#general'])[0]).replace('#', ''),
    Description: text.replace(/^\/(chi|thu)/, '').replace(/#[\p{L}\p{N}_-]+/gu, '').trim(),
  }
}

function getRows(sheetName) {
  const sheet = getSheet(sheetName)
  const values = sheet.getDataRange().getValues()
  if (values.length < 2) return []
  const headers = values[0]
  return values.slice(1).filter((row) => row.some(Boolean)).map((row) => {
    const item = {}
    headers.forEach((header, index) => {
      item[header] = row[index]
    })
    return item
  })
}

function appendObject(sheetName, object) {
  const sheet = getSheet(sheetName)
  const headers = SHEETS[sheetName]
  sheet.appendRow(headers.map((header) => object[header] || ''))
}

function getSheet(name) {
  return SpreadsheetApp.getActive().getSheetByName(name) || SpreadsheetApp.getActive().insertSheet(name)
}

function getSetting(key) {
  const settings = getRows('Settings')
  const item = settings.find((row) => row.Key === key)
  const value = item && item.Value
  return value || PropertiesService.getScriptProperties().getProperty(key) || ''
}

function setSettingValue(key, value, note) {
  const sheet = getSheet('Settings')
  const values = sheet.getDataRange().getValues()
  for (let i = 1; i < values.length; i += 1) {
    if (values[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value)
      if (note) sheet.getRange(i + 1, 3).setValue(note)
      return
    }
  }
  sheet.appendRow([key, value, note || ''])
}

function isAllowedTelegramUser(userId) {
  const allowed = getSetting('TELEGRAM_ALLOWED_USER_ID')
  return !allowed || String(allowed) === String(userId)
}

function sendTelegramMessage(chatId, text) {
  const token = getSetting('TELEGRAM_BOT_TOKEN')
  if (!token || !chatId) return
  UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text }),
    muteHttpExceptions: true,
  })
}

function formatTaskList(tasks) {
  if (!tasks.length) return 'Không có task đang mở.'
  return tasks.map((task) => `${task.ID} - ${task.Priority} - ${task.Title}`).join('\n')
}

function logAction(action, payload, result) {
  try {
    appendObject('Logs', {
      Time: new Date().toISOString(),
      Action: action,
      Payload: JSON.stringify(payload),
      Result: JSON.stringify(result),
    })
  } catch (error) {
    console.error(error)
  }
}

function asTags(tags) {
  if (Array.isArray(tags)) return tags.join(', ')
  return tags || ''
}

function makeId(prefix) {
  return `${prefix}-${Utilities.getUuid().slice(0, 8).toUpperCase()}`
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}
