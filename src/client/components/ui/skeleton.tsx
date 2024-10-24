import { cn } from '~c/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-sm bg-muted', className)} {...props} />
}

export { Skeleton }
