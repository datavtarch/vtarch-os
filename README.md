# VTARCH OS

Personal operating system for tasks, reminders, notes, finance, Telegram input, Google Sheets storage, and a React dashboard.

## Live Google Assets

- Google Sheet: https://docs.google.com/spreadsheets/d/1rkx-MQGgihutVDQjIfhDuPsuqBrFJc2IyLQZI6w1pps/edit
- Apps Script project: https://script.google.com/home/projects/1cVQkXjH_GrwvjmvLNoHQGvmkqEI5jvBLvkhZHIWxEV5g_CkY5DN2BQSj/edit
- Web App API: set in `.env` as `VITE_APPS_SCRIPT_URL`

## Local Development

```bash
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1
```

## Verification

```bash
npm.cmd run build
npm.cmd run lint
```

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
