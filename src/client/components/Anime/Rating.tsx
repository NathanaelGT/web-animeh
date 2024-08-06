import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/tooltip'

type Props = {
  rating: string | null
}

export function AnimeRating({ rating }: Props) {
  const text = rating || '?'

  const className =
    {
      'G': 'bg-green-100',
      'PG': 'bg-blue-100',
      'PG-13': 'bg-yellow-100',
      'R': 'bg-orange-100',
      'R+': 'bg-red-100',
      'Rx': 'bg-red-400',
    }[text] ?? 'bg-gray-200'

  const tooltip =
    {
      'G': 'All Ages',
      'PG': 'Children',
      'PG-13': 'Teens 13 or older',
      'R': '17+ (violence & profanity)',
      'R+': 'Mild Nudity',
      'Rx': 'Hentai',
    }[text] ?? 'Rating'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className={`${className} px-2 py-1`}>{text}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
