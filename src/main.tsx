import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { applyTheme, getStoredTheme } from '@/shared/lib/theme'
import { hasAuthCallback } from '@/apps/hub/auth/github-auth'
import { isHubDemo, seedDemoSession } from '@/apps/hub/dev/demo'

// Apply the saved theme before first paint.
applyTheme(getStoredTheme())
// GitHub sends sign-in back to "/?code=…&state=…"; hop to the callback route before the router mounts.
if (hasAuthCallback(window.location.search)) window.location.hash = '#/hub/callback'
if (import.meta.env.DEV && isHubDemo()) seedDemoSession()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
