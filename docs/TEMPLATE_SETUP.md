# VTARCH OS Template Setup

Use this flow when someone copies the app for their own Google account.

## What The User Copies

- GitHub repo: frontend app.
- Google Sheet: personal database.
- Apps Script: API, Telegram bot, setup menu.

## Setup Flow

1. Copy the Google Sheet template.
2. Open the copied Sheet.
3. Run `VTARCH OS -> Cài đặt nhanh`.
4. Enter app name, Telegram token, chat ID, allowed user ID, and Web App URL if available.
5. Run `Deploy -> New deployment -> Web app`.
6. Copy the Web App URL ending in `/exec`.
7. Open the VTARCH OS app.
8. Press the settings button.
9. Paste the Web App URL.
10. Click `Kiểm tra và lưu`.

## Security Rules

- Do not put Telegram token in frontend code.
- Do not commit `.env`.
- Store Telegram token in Apps Script Properties.
- Each copied app should use its own Google Sheet and Apps Script deployment.

## User-Facing Minimum

For a non-technical user, the required visible inputs are:

- App name.
- Apps Script Web App URL.
- Telegram token only inside the Sheet setup dialog.

The app stores only the Web App URL in browser `localStorage`.
