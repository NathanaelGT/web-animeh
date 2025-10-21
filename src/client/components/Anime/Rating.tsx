import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/tooltip'
import { cn } from '~c/utils'
import { ratingColor, ratings } from '~/shared/anime/rating'
import type { PropsWithChildren } from 'react'

type Props = PropsWithChildren<{
  rating: string | null
  className?: string
}>

export function AnimeRating({ rating, className, children }: Props) {
  const text = (rating || '?') as keyof typeof ratings

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger tabIndex={-1} className={cn('px-2 py-1', ratingColor(text), className)}>
          {children ?? text}
        </TooltipTrigger>
        <TooltipContent>{ratings[text] ?? 'Rating'}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
