import { ExternalLink, Sprout } from 'lucide-react'
import { EmptyState } from '@/shared/components/EmptyState'
import { Button } from '@/shared/ui/button'
import { githubRepoUrl } from '@/apps/hub/config'

export function HubEmpty() {
  return (
    <div className="mt-6">
      <EmptyState icon={Sprout} title="Nothing in personal-hub yet" description="Add NOW notes, projects.md or ideas.md to the repo and they show up here. Your first idea creates ideas.md for you.">
        <Button asChild variant="outline" size="sm">
          <a href={githubRepoUrl()} target="_blank" rel="noreferrer">
            <ExternalLink />
            Open personal-hub on GitHub
          </a>
        </Button>
      </EmptyState>
    </div>
  )
}
