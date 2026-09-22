import * as React from 'react'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import { filterSuggestions } from './combobox-filter'

export interface ComboboxProps {
  value: string
  onValueChange: (value: string) => void
  onSelect: (value: string) => void
  suggestions: string[]
  placeholder?: string
  allowNew?: boolean
  'aria-label'?: string
}

export function Combobox({
  value,
  onValueChange,
  onSelect,
  suggestions,
  placeholder,
  allowNew = true,
  ...rest
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState(0)
  const rootRef = React.useRef<HTMLDivElement>(null)

  const matches = filterSuggestions(suggestions, value)
  const trimmed = value.trim()
  const hasExact = suggestions.some((s) => s.toLowerCase() === trimmed.toLowerCase())
  const showNew = allowNew && trimmed.length > 0 && !hasExact
  const rows: { label: string; value: string; isNew?: boolean }[] = [
    ...matches.map((m) => ({ label: m, value: m })),
    ...(showNew ? [{ label: `Add “${trimmed}”`, value: trimmed, isNew: true }] : []),
  ]

  // Close on outside click.
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function choose(v: string) {
    onSelect(v)
    setOpen(false)
    setActive(0)
  }

  return (
    <div ref={rootRef} className="relative flex-1">
      <Input
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        aria-label={rest['aria-label']}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onValueChange(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActive((a) => Math.min(a + 1, Math.max(rows.length - 1, 0)))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            const row = rows[active]
            if (row) choose(row.value)
            else if (trimmed) choose(trimmed)
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      {open && rows.length > 0 && (
        <ul
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-56 overflow-auto rounded-md border border-border bg-card p-1 shadow-md"
          role="listbox"
        >
          {rows.map((row, i) => (
            <li key={`${row.value}-${row.isNew ? 'new' : 'sug'}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(row.value)}
                className={cn(
                  'flex w-full items-center rounded-sm px-2.5 py-2 text-left text-sm',
                  i === active ? 'bg-secondary text-secondary-foreground' : 'text-foreground',
                  row.isNew && 'text-primary',
                )}
              >
                {row.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
