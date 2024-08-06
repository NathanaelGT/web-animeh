import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/tooltip'

type Props = {
  episode: number | null
}

export function AnimeEpisode({ episode }: Props) {
  let text: string
  let className: string

  if (episode) {
    text = episode + 'eps'

    if (episode < 2) {
      className = 'bg-purple-100'
    } else if (episode < 15) {
      className = 'bg-pink-100'
    } else if (episode < 27) {
      className = 'bg-cyan-100'
    } else if (episode < 100) {
      className = 'bg-blue-100'
    } else {
      className = 'bg-red-100'
    }
  } else {
    text = '?'
    className = 'bg-gray-200'
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className={`${className} px-2 py-1`}>{text}</TooltipTrigger>
        <TooltipContent>{episode ? episode + ' Episode' : 'Jumlah Episode'}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
