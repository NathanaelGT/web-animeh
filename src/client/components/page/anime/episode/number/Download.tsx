import { useState } from 'react'
import { api } from '~c/trpc'
import { Button } from '@/ui/button'

type Props = {
  animeId: number
  episodeNumber: number
}

export function Download(props: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const downloadEpisode = api.component.poster.download.useMutation()

  if (isLoading) {
    return (
      <div className="m-auto">
        <p>Memuat unduhan</p>
      </div>
    )
  }

  return (
    <div className="m-auto flex flex-col gap-3">
      <p>Episode {props.episodeNumber} belum terunduh</p>
      <Button
        onClick={() => {
          setIsLoading(true)
          downloadEpisode.mutate(props)
        }}
        variant="indigo"
        size="sm"
        className="font-bold"
      >
        Unduh
      </Button>
    </div>
  )
}
