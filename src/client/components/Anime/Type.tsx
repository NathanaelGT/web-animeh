import type { AnimeType } from '~s/db/schema'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/tooltip'

type Props = {
  type: AnimeType
}

export function AnimeType({ type }: Props) {
  const className =
    {
      'Movie': 'bg-purple-100',
      'ONA': 'bg-cyan-100',
      'OVA': 'bg-teal-100',
      'Special': 'bg-pink-100',
      'TV': 'bg-indigo-100',
      'TV Special': 'bg-violet-400',
    }[type as string] ?? 'bg-gray-200'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger tabIndex={-1} className={`${className} px-2 py-1`}>
          {type}
        </TooltipTrigger>
        <TooltipContent>Jenis</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
