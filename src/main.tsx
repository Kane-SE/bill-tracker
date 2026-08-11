import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { applyTheme, getStoredTheme } from '@/lib/theme'

// Apply the saved theme before first paint.
applyTheme(getStoredTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
