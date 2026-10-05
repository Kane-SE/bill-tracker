import { Fragment } from 'react'

const TOKEN = /(PR #\d+|https?:\/\/[^\s)]+)/g

/** Turns `PR #n` (needs the project's repo link) and URLs into links; everything else stays text. */
export function Linkified({ text, repoLink }: { text: string; repoLink: string | null }) {
  return (
    <>
      {text.split(TOKEN).map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>
        const href = part.startsWith('PR #') ? (repoLink ? `${repoLink.replace(/\/$/, '')}/pull/${part.slice(4)}` : null) : part
        return href ? (
          <a key={i} href={href} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
            {part}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      })}
    </>
  )
}
