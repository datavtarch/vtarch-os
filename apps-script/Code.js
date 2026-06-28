const SHEETS = {
  Tasks: ['ID', 'Title', 'Status', 'Priority', 'Project', 'Tags', 'DueAt', 'RemindAt', 'Note', 'CreatedAt', 'DoneAt', 'Source'],
  Notes: ['ID', 'Content', 'Type', 'Tags', 'Project', 'LinkedTaskID', 'FileURL', 'CreatedAt', 'Source'],
  Finance: ['ID', 'Date', 'Type', 'Amount', 'Category', 'Description', 'Project', 'PaymentMethod', 'ReceiptURL', 'CreatedAt'],
  Reminders: ['ID', 'TaskID', 'RemindAt', 'RepeatRule', 'LastSentAt', 'SnoozeUntil', 'Enabled'],
  Projects: ['ID', 'Name', 'Goal', 'Status', 'Deadline', 'NextAction', 'CreatedAt'],
  Settings: ['Key', 'Value', 'Note'],
  Logs: ['Time', 'Action', 'Payload', 'Result'],
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('VTARCH OS')
    .addItem('Cài đặt nhanh', 'showSetupDialog')
    .addItem('Tạo/cập nhật bảng', 'setup')
    .addItem('Test Telegram', 'testTelegram')
    .addToUi()
}

function showSetupDialog() {
  const html = HtmlService.createHtmlOutput(`
    <style>
      body { background:#0b0d12; color:#f4f4f5; font-family:Arial,sans-serif; margin:0; padding:18px; }
      label { display:block; margin:12px 0; }
      span { color:#a1a1aa; display:block; font-size:12px; margin-bottom:6px; }
      input { background:#050609; border:1px solid #27272a; border-radius:12px; color:white; font-size:14px; height:42px; padding:0 12px; width:100%; box-sizing:border-box; }
      button { background:white; border:0; border-radius:14px; color:#09090b; cursor:pointer; font-weight:700; height:44px; margin-top:10px; width:100%; }
      .hint { color:#71717a; font-size:12px; line-height:1.5; margin-top:12px; }
      .status { color:#86efac; font-size:12px; margin-top:12px; min-height:18px; }
    </style>
    <form id="setup">
      <label><span>Tên app</span><input name="appName" value="VTARCH OS"></label>
      <label><span>Telegram Bot Token</span><input name="telegramBotToken" placeholder="123456:ABC..."></label>
      <label><span>Telegram Chat ID</span><input name="telegramChatId" placeholder="Có thể để trống, bot sẽ tự bắt khi /start"></label>
      <label><span>Telegram User ID được phép dùng</span><input name="telegramAllowedUserId" placeholder="Có thể để trống"></label>
      <label><span>Web App URL</span><input name="webAppUrl" placeholder="https://script.google.com/macros/s/.../exec"></label>
      <button type="submit">Lưu cài đặt</button>
      <p class="hint">Token chỉ lưu trong Apps Script Properties của file này, không đưa vào frontend.</p>
      <p class="status" id="status"></p>
    </form>
    <script>
      google.script.run.withSuccessHandler(function(state) {
        document.querySelector('[name=appName]').value = state.appName || 'VTARCH OS';
        document.querySelector('[name=telegramChatId]').value = state.telegramChatId || '';
        document.querySelector('[name=telegramAllowedUserId]').value = state.telegramAllowedUserId || '';
        document.querySelector('[name=webAppUrl]').value = state.webAppUrl || '';
      }).getSetupState();

      document.getElementById('setup').addEventListener('submit', function(event) {
        event.preventDefault();
        var status = document.getElementById('status');
        status.textContent = 'Đang lưu...';
        var data = Object.fromEntries(new FormData(event.target).entries());
        google.script.run
          .withSuccessHandler(function(result) { status.textContent = result.message; })
          .withFailureHandler(function(error) { status.textContent = error.message || 'Không lưu được.'; })
          .saveSetupConfig(data);
      });
    </script>
  `)
    .setWidth(420)
    .setHeight(560)

  SpreadsheetApp.getUi().showModalDialog(html, 'VTARCH OS Setup')
}

function getSetupState() {
  return {
    appName: getSetting('APP_NAME') || 'VTARCH OS',
    telegramAllowedUserId: getSetting('TELEGRAM_ALLOWED_USER_ID'),
    telegramChatId: getSetting('TELEGRAM_CHAT_ID'),
    webAppUrl: getSetting('WEB_APP_URL'),
  }
}

function saveSetupConfig(form) {
  setup()
  const properties = PropertiesService.getScriptProperties()
  const appName = String(form.appName || 'VTARCH OS').trim()
  const token = String(form.telegramBotToken || '').trim()
  const chatId = String(form.telegramChatId || '').trim()
  const allowedUserId = String(form.telegramAllowedUserId || '').trim()
  const webAppUrl = String(form.webAppUrl || '').trim()

  setSettingValue('APP_NAME', appName, 'Tên app hiển thị')
  if (token) {
    properties.setProperty('TELEGRAM_BOT_TOKEN', token)
    setSettingValue('TELEGRAM_BOT_TOKEN', 'Stored in Script Properties', 'Token không ghi trực tiếp vào Sheet')
  }
  if (chatId) setSettingValue('TELEGRAM_CHAT_ID', chatId, 'Chat nhận báo cáo và nhắc việc')
  if (allowedUserId) setSettingValue('TELEGRAM_ALLOWED_USER_ID', allowedUserId, 'Telegram user được phép dùng bot')
  if (webAppUrl) {
    setSettingValue('WEB_APP_URL', webAppUrl, 'Dán URL này vào màn hình setup của app')
    if (getSetting('TELEGRAM_BOT_TOKEN')) setTelegramWebhook(webAppUrl)
  }

  return { ok: true, message: 'Đã lưu. Dán Web App URL vào app để kết nối.' }
}

function testTelegram() {
  const chatId = getSetting('TELEGRAM_CHAT_ID')
  if (!getSetting('TELEGRAM_BOT_TOKEN')) throw new Error('Chưa có Telegram Bot Token.')
  if (!chatId) throw new Error('Chưa có Telegram Chat ID.')
  sendTelegramMessage(chatId, 'VTARCH OS đã kết nối Telegram.')
  SpreadsheetApp.getUi().alert('Đã gửi tin nhắn test.')
}

function setTelegramWebhook(webAppUrl) {
  const token = getSetting('TELEGRAM_BOT_TOKEN')
  if (!token || !webAppUrl) return
  UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ url: webAppUrl }),
    muteHttpExceptions: true,
  })
}

function setup() {
  const spreadsheet = SpreadsheetApp.getActive()
  Object.keys(SHEETS).forEach((name) => {
    const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name)
    const headers = SHEETS[name]
    const lastColumn = Math.max(sheet.getLastColumn(), headers.length)
    const existingHeaders = sheet.getLastRow()
      ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
      : []

    headers.forEach((header, index) => {
      if (existingHeaders[index] !== header) sheet.getRange(1, index + 1).setValue(header)
    })
    sheet.setFrozenRows(1)
    sheet.autoResizeColumns(1, headers.length)
  })

  ensureSettingValue('APP_NAME', 'VTARCH OS', 'Tên app hiển thị')
  ensureSettingValue('TELEGRAM_BOT_TOKEN', '', 'Set in Script Properties for better security')
  ensureSettingValue('TELEGRAM_ALLOWED_USER_ID', '', 'Only this Telegram user can control the bot')
  ensureSettingValue('TELEGRAM_CHAT_ID', '', 'Default chat for reports and reminders')
  ensureSettingValue('WEB_APP_URL', '', 'Apps Script Web App URL')
  ensureSettingValue('TIMEZONE', 'Asia/Bangkok', 'Timezone used for reminders')
  ensureSettingValue('MORNING_REPORT_TIME', '08:00', 'Daily planning message time')

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
  sheet.appendRow(headers.map((header) => object[header] ?? ''))
}

function getSheet(name) {
  return SpreadsheetApp.getActive().getSheetByName(name) || SpreadsheetApp.getActive().insertSheet(name)
}

function getSetting(key) {
  const propertyValue = PropertiesService.getScriptProperties().getProperty(key)
  if (propertyValue) return propertyValue
  const settings = getRows('Settings')
  const item = settings.find((row) => row.Key === key)
  const value = item && item.Value
  return value || ''
}

function ensureSettingValue(key, value, note) {
  const settings = getRows('Settings')
  if (settings.some((row) => row.Key === key)) return
  setSettingValue(key, value, note)
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
