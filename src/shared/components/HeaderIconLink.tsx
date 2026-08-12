import { Link } from 'react-router-dom'
import { Button } from '@/shared/ui/button'

interface HeaderIconLinkProps {
  to: string
  label: string
  children: React.ReactNode
}

/** Icon-only navigation button for page headers. */
export function HeaderIconLink({ to, label, children }: HeaderIconLinkProps) {
  return (
    <Button asChild variant="ghost" size="icon">
      <Link to={to} aria-label={label}>
        {children}
      </Link>
    </Button>
  )
}
