import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const appsScriptUrl = env.VITE_APPS_SCRIPT_URL
  const appsScript = appsScriptUrl ? new URL(appsScriptUrl) : null

  return {
    base: process.env.GITHUB_ACTIONS ? '/vtarch-os/' : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: appsScript
      ? {
          proxy: {
            '/api/apps-script': {
              target: appsScript.origin,
              changeOrigin: true,
              followRedirects: true,
              rewrite: (requestPath) =>
                requestPath.replace(/^\/api\/apps-script/, appsScript.pathname),
            },
          },
        }
      : undefined,
  }
})
