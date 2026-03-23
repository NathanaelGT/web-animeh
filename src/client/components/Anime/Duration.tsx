import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/tooltip'

type Props = {
  duration: number | null
}

export function AnimeDuration({ duration }: Props) {
  let text: string
  let className: string

  if (!duration) {
    text = '?'
    className = 'bg-gray-200'
  } else {
    if (duration < 60) {
      text = duration + 'd'
      className = 'bg-blue-100'
    } else if (duration < 3600) {
      text = Math.trunc(duration / 60) + 'm'

      if (duration < 20 * 60) {
        className = 'bg-blue-200'
      } else if (duration < 32 * 60) {
        className = 'bg-green-200'
      } else {
        className = 'bg-yellow-200'
      }
    } else {
      text = Math.trunc(duration / 3600) + 'j ' + Math.trunc((duration % 3600) / 60) + 'm'
      className = 'bg-orange-200'
    }
  }

  const tooltip = text.replace('d', ' Detik').replace('m', ' Menit').replace('j', ' Jam')

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger tabIndex={-1} className={`${className} px-2 py-1`}>
          {text}
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
