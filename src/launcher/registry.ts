import { Receipt, type LucideIcon } from 'lucide-react'

export interface AppEntry {
  id: string
  name: string
  description: string
  icon: LucideIcon
  to: string
}

/** Every mini-app in the PWA. Add an entry (and its routes) to ship a new app. */
export const apps: AppEntry[] = [
  {
    id: 'split',
    name: 'Split',
    description: 'Who owes whom after a hangout',
    icon: Receipt,
    to: '/split',
  },
]
