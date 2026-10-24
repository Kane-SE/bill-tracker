import type { TrackView } from '@/apps/pump/lib/titles'
import { TitleTrack } from '@/apps/pump/components/TitleTrack'

interface TitlesTabProps {
  views: TrackView[]
  earned: ReadonlySet<string>
  onToggle(id: string): void
  onOpen(chartId: number): void
}

/** PHOENIX 2's nine skill-title tracks with your progress. */
export function TitlesTab({ views, earned, onToggle, onOpen }: TitlesTabProps) {
  return (
    <div className="space-y-6">
      {views.map((v) => (
        <TitleTrack key={v.track} view={v} earned={earned} onToggle={onToggle} onOpen={onOpen} />
      ))}
    </div>
  )
}
