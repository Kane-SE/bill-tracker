import { useState } from 'react'
import type { Song } from '@/apps/pump/data/types'
import { songInitials } from '@/apps/pump/lib/labels'
import { cn } from '@/shared/lib/utils'

/** URLs that failed to load this session, so a re-mounted row doesn't retry them. */
const failed = new Set<string>()

interface SongArtProps {
  song: Song
  className?: string
  /** load now instead of lazily (the chart sheet's hero) */
  eager?: boolean
  /** what to show with no image or a failed one: initials on a tinted box, or nothing */
  fallback?: 'initials' | null
}

/** The song's jacket art, or a placeholder (initials on a tinted box) when missing or broken. */
export function SongArt({ song, className, eager, fallback = 'initials' }: SongArtProps) {
  const url = song.image
  const [badUrl, setBadUrl] = useState<string>()
  const broken = !url || failed.has(url) || badUrl === url
  if (broken || !url) {
    if (fallback === null) return null
    return (
      <span aria-hidden className={cn('grid shrink-0 place-items-center bg-secondary text-xs font-bold text-muted-foreground', className)}>
        {songInitials(song.title)}
      </span>
    )
  }
  return (
    <img
      src={url}
      alt=""
      decoding="async"
      loading={eager ? 'eager' : 'lazy'}
      onError={() => {
        failed.add(url)
        setBadUrl(url)
      }}
      className={cn('shrink-0 bg-secondary object-cover ring-1 ring-border dark:brightness-90', className)}
    />
  )
}
