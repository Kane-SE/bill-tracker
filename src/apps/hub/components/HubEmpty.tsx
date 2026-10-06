import { ExternalLink, Plus, Sprout } from 'lucide-react'
import { EmptyState } from '@/shared/components/EmptyState'
import { Button } from '@/shared/ui/button'
import { githubRepoUrl } from '@/apps/hub/config'

export function HubEmpty({ onNew }: { onNew: () => void }) {
  return (
    <div className="mt-6">
      <EmptyState icon={Sprout} title="Nothing in personal-hub yet" description="Add NOW notes, projects.md or ideas.md to the repo and they show up here. Your first idea creates ideas.md for you.">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* Phones use the pinned bottom bar; desktop has no other New idea entry while the grid is hidden. */}
          <Button size="sm" className="hidden lg:inline-flex" onClick={onNew}>
            <Plus />
            New idea
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={githubRepoUrl()} target="_blank" rel="noreferrer">
              <ExternalLink />
              Open personal-hub on GitHub
            </a>
          </Button>
        </div>
      </EmptyState>
    </div>
  )
}
