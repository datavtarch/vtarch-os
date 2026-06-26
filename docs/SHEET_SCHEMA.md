# Google Sheets schema

Create a Google Sheet with these tabs. The Apps Script backend can also create them automatically through the `setup()` function.

## Tasks

| Column | Purpose |
| --- | --- |
| ID | Unique task id |
| Title | Task title |
| Status | Inbox, Doing, Waiting, Done, Cancelled |
| Priority | P1, P2, P3 |
| Project | Project name |
| Tags | Comma-separated tags |
| DueAt | ISO date/time |
| RemindAt | ISO date/time |
| Note | Extra context |
| CreatedAt | ISO date/time |
| DoneAt | ISO date/time |
| Source | Telegram, Web, Manual |

## Notes

| Column | Purpose |
| --- | --- |
| ID | Unique note id |
| Content | Note text |
| Type | text, link, photo, file |
| Tags | Comma-separated tags |
| Project | Project name |
| LinkedTaskID | Related task id |
| FileURL | Drive/file URL |
| CreatedAt | ISO date/time |
| Source | Telegram, Web, Manual |

## Finance

| Column | Purpose |
| --- | --- |
| ID | Unique transaction id |
| Date | ISO date |
| Type | income, expense, debt, transfer |
| Amount | Number |
| Category | Category name |
| Description | Transaction description |
| Project | Project name |
| PaymentMethod | Cash, bank, card, e-wallet |
| ReceiptURL | Drive/file URL |
| CreatedAt | ISO date/time |

## Reminders

| Column | Purpose |
| --- | --- |
| ID | Unique reminder id |
| TaskID | Related task id |
| RemindAt | ISO date/time |
| RepeatRule | none, daily, weekly, monthly |
| LastSentAt | ISO date/time |
| SnoozeUntil | ISO date/time |
| Enabled | TRUE/FALSE |

## Projects

| Column | Purpose |
| --- | --- |
| ID | Unique project id |
| Name | Project name |
| Goal | Project goal |
| Status | Active, Paused, Done |
| Deadline | ISO date |
| NextAction | Next visible action |
| CreatedAt | ISO date/time |

## Settings

| Column | Purpose |
| --- | --- |
| Key | Setting key |
| Value | Setting value |
| Note | Explanation |

## Logs

| Column | Purpose |
| --- | --- |
| Time | ISO date/time |
| Action | Action name |
| Payload | JSON payload |
| Result | JSON result or message |
